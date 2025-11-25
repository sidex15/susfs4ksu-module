#include <sys/types.h>
#include <sys/stat.h>
#include <sys/mount.h>
#include <sys/xattr.h>
#include <sys/statfs.h>
#include <dirent.h>
#include <fcntl.h>
#include <unistd.h>
#include <errno.h>
#include <limits.h>
#include <stdarg.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/syscall.h>
#include <sys/ioctl.h>
#include <stdint.h>

int setns(int fd, int nstype);

/*==============================================================================
 * 常量 & 宏
 *============================================================================*/

#define MAGIC_MOUNT_VERSION "0.1.0"

#define DEFAULT_MOUNT_SOURCE "KSU"
#define DEFAULT_MODULE_DIR "/data/adb/modules"
#define DEFAULT_TEMP_DIR "/dev/.magic_mount" // fallback

#define DISABLE_FILE_NAME "disable"
#define REMOVE_FILE_NAME "remove"
#define SKIP_MOUNT_FILE_NAME "skip_mount"

#define REPLACE_DIR_XATTR "trusted.overlay.opaque"
#define SELINUX_XATTR "security.selinux"

#ifndef PATH_MAX
#define PATH_MAX 4096
#endif

#ifndef TMPFS_MAGIC
#define TMPFS_MAGIC 0x01021994
#endif

#define UNUSED(x) (void)(x)

/*==============================================================================
 * 统计信息 & 全局配置
 *============================================================================*/

typedef struct {
	int modules_total;
	int nodes_total;
	int nodes_mounted;
	int nodes_skipped;
	int nodes_whiteout;
	int nodes_fail;
} MountStats;

static MountStats g_stats = { 0 };

static const char *g_module_dir = DEFAULT_MODULE_DIR;
static const char *g_mount_source = DEFAULT_MOUNT_SOURCE;
static FILE *g_log_file = NULL; // NULL => stderr
static int g_log_level = 2; // 0=ERROR,1=WARN,2=INFO,3=DEBUG

/* 记录发生失败的模块名 & 额外分区列表 */
static char **g_failed_modules = NULL;
static int g_failed_modules_count = 0;

static char **g_extra_parts = NULL; // 额外分区名，如 "my_custom"
static int g_extra_parts_count = 0;

/*==============================================================================
 * 日志
 *============================================================================*/

static void vlog(const char *lv, const char *fmt, va_list ap)
{
	FILE *out = g_log_file ? g_log_file : stderr;
	fprintf(out, "[%s] ", lv);
	vfprintf(out, fmt, ap);
	fputc('\n', out);
	fflush(out);
}

static void log_msg(const char *lv, const char *fmt, ...)
{
	va_list ap;
	va_start(ap, fmt);
	vlog(lv, fmt, ap);
	va_end(ap);
}

#define LV_ERROR 0
#define LV_WARN 1
#define LV_INFO 2
#define LV_DEBUG 3

#define LOG(lv, ...)                                                           \
	do {                                                                   \
		if ((lv) <= g_log_level)                                       \
			log_msg((lv) == LV_ERROR ? "ERROR" :                   \
				(lv) == LV_WARN	 ? "WARN" :                    \
				(lv) == LV_INFO	 ? "INFO" :                    \
						   "DEBUG",                     \
				__VA_ARGS__);                                  \
	} while (0)

#define LOGE(...) LOG(LV_ERROR, __VA_ARGS__)
#define LOGW(...) LOG(LV_WARN, __VA_ARGS__)
#define LOGI(...) LOG(LV_INFO, __VA_ARGS__)
#define LOGD(...) LOG(LV_DEBUG, __VA_ARGS__)

// kernelsu api, atleast ones we care about
#define KSU_INSTALL_MAGIC1 0xDEADBEEF
#define KSU_INSTALL_MAGIC2 0xCAFEBABE

struct ksu_add_try_umount_cmd {
	uint64_t arg; // char ptr, this is the mountpoint
	uint32_t flags; // this is the flag we use for it
	uint8_t mode; // denotes what to do with it 0:wipe_list 1:add_to_list 2:delete_entry
};

#define KSU_IOCTL_ADD_TRY_UMOUNT _IOC(_IOC_WRITE, 'K', 18, 0)
int global_fd = 0;

static void grab_fd(void) { syscall(SYS_reboot, KSU_INSTALL_MAGIC1, KSU_INSTALL_MAGIC2, 0, (void *)&global_fd); }

static void send_unmountable(const char *mntpoint) { 
	struct ksu_add_try_umount_cmd cmd = {0};

	if (!global_fd)
		return;

	cmd.arg = (uint64_t)mntpoint;
	cmd.flags = 0x2;
	cmd.mode = 1;
	
	ioctl(global_fd, KSU_IOCTL_ADD_TRY_UMOUNT, &cmd);

}

/*==============================================================================
 * 工具函数
 *============================================================================*/

static int path_join(const char *base, const char *name, char *buf, size_t n)
{
	if (!base) {
		errno = EINVAL;
		return -1;
	}

	if (!name || !name[0]) {
		if (snprintf(buf, n, "%s", base) >= (int)n) {
			errno = ENAMETOOLONG;
			return -1;
		}
		return 0;
	}

	if (!base[0] || (base[0] == '/' && !base[1])) {
		if (snprintf(buf, n, "/%s", name) >= (int)n) {
			errno = ENAMETOOLONG;
			return -1;
		}
	} else {
		size_t len = strlen(base);
		if (base[len - 1] == '/') {
			if (snprintf(buf, n, "%s%s", base, name) >= (int)n) {
				errno = ENAMETOOLONG;
				return -1;
			}
		} else {
			if (snprintf(buf, n, "%s/%s", base, name) >= (int)n) {
				errno = ENAMETOOLONG;
				return -1;
			}
		}
	}
	return 0;
}

static bool path_exists(const char *p)
{
	struct stat st;
	return (stat(p, &st) == 0);
}

static bool path_is_dir(const char *p)
{
	struct stat st;
	return (stat(p, &st) == 0) && S_ISDIR(st.st_mode);
}

static bool path_is_symlink(const char *p)
{
	struct stat st;
	return (lstat(p, &st) == 0) && S_ISLNK(st.st_mode);
}

static int mkdir_p(const char *dir)
{
	if (!dir || !dir[0]) {
		errno = EINVAL;
		return -1;
	}

	struct stat st;
	if (stat(dir, &st) == 0) {
		if (S_ISDIR(st.st_mode))
			return 0;
		LOGE("%s is not directory", dir);
		errno = ENOTDIR;
		return -1;
	}

	char tmp[PATH_MAX];
	if (strlen(dir) >= sizeof(tmp)) {
		errno = ENAMETOOLONG;
		return -1;
	}

	strcpy(tmp, dir);
	char *s = strrchr(tmp, '/');
	if (s && s != tmp) {
		*s = 0;
		if (mkdir_p(tmp) != 0)
			return -1;
	}

	if (mkdir(dir, 0755) == 0 || errno == EEXIST)
		return 0;

	LOGE("mkdir %s: %s", dir, strerror(errno));
	return -1;
}

static bool is_rw_tmpfs(const char *path)
{
	if (!path_is_dir(path))
		return false;

	struct statfs s;
	if (statfs(path, &s) < 0)
		return false;
	if ((unsigned long)s.f_type != (unsigned long)TMPFS_MAGIC)
		return false;

	char tmpl[PATH_MAX];
	if (path_join(path, ".magic_mount_testXXXXXX", tmpl, sizeof(tmpl)) != 0)
		return false;

	int fd = mkstemp(tmpl);
	if (fd < 0)
		return false;
	close(fd);
	unlink(tmpl);
	return true;
}

/* 释放字符串数组并清零 */
static void free_string_array(char ***arr, int *count)
{
	if (!arr || !*arr || !count)
		return;
	for (int i = 0; i < *count; ++i)
		free((*arr)[i]);
	free(*arr);
	*arr = NULL;
	*count = 0;
}

/* 自动选择 tempdir：第一个 rw tmpfs 下的 .magic_mount，否则 fallback */
static const char *select_auto_tempdir(char buf[PATH_MAX])
{
	const char *tmp_list[] = { "/mnt/vendor", "/mnt", "/debug_ramdisk" };
	size_t n = sizeof(tmp_list) / sizeof(tmp_list[0]);

	for (size_t i = 0; i < n; ++i) {
		const char *base = tmp_list[i];
		if (!is_rw_tmpfs(base))
			continue;
		if (path_join(base, ".magic_mount", buf, PATH_MAX) != 0)
			continue;

		LOGI("auto tempdir selected: %s (from %s)", buf, base);
		return buf;
	}

	LOGW("no rw tmpfs found in candidates, fallback to %s",
	     DEFAULT_TEMP_DIR);
	return DEFAULT_TEMP_DIR;
}

/* 记录模块失败（去重） */
static void register_module_failure(const char *module_name)
{
	if (!module_name)
		return;

	for (int i = 0; i < g_failed_modules_count; ++i) {
		if (strcmp(g_failed_modules[i], module_name) == 0)
			return;
	}

	char **arr =
		realloc(g_failed_modules,
			(size_t)(g_failed_modules_count + 1) * sizeof(char *));
	if (!arr)
		return;

	g_failed_modules = arr;
	g_failed_modules[g_failed_modules_count] = strdup(module_name);
	if (!g_failed_modules[g_failed_modules_count])
		return;

	g_failed_modules_count++;
}

/* 添加额外分区名，name 为单个 token（不含逗号） */
static void add_extra_part_token(const char *start, size_t len)
{
	while (len > 0 && (start[0] == ' ' || start[0] == '\t')) {
		start++;
		len--;
	}
	while (len > 0 && (start[len - 1] == ' ' || start[len - 1] == '\t'))
		len--;

	if (len == 0)
		return;

	char *name = malloc(len + 1);
	if (!name)
		return;

	memcpy(name, start, len);
	name[len] = '\0';

	char **arr = realloc(g_extra_parts, (size_t)(g_extra_parts_count + 1) *
						    sizeof(char *));
	if (!arr) {
		free(name);
		return;
	}

	g_extra_parts = arr;
	g_extra_parts[g_extra_parts_count++] = name;
}

/*==============================================================================
 * SELinux xattr（通用接口）
 *============================================================================*/

static int lsetfilecon(const char *path, const char *con)
{
#if defined(__linux__)
	if (!path || !con) {
		LOGD("lsetfilecon called with path=%p, con=%p (skip)",
		     (void *)path, (void *)con);
		return 0;
	}

	LOGD("lsetfilecon(%s, \"%s\")", path, con);

	if (lsetxattr(path, SELINUX_XATTR, con, strlen(con), 0) < 0) {
		LOGW("setcon %s: %s", path, strerror(errno));
		return -1;
	}

	LOGD("lsetfilecon(%s) ok", path);
#else
	LOGD("lsetfilecon(%s, %s) skipped (no SELinux on this platform)",
	     path ? path : "(null)", con ? con : "(null)");
	UNUSED(path);
	UNUSED(con);
#endif
	return 0;
}

static int lgetfilecon(const char *path, char **out)
{
	*out = NULL;
#if defined(__linux__)
	if (!path) {
		LOGD("lgetfilecon called with NULL path");
		errno = EINVAL;
		return -1;
	}

	LOGD("lgetfilecon(%s)", path);

	ssize_t sz = lgetxattr(path, SELINUX_XATTR, NULL, 0);
	if (sz < 0) {
		LOGW("getcon %s: %s", path, strerror(errno));
		return -1;
	}

	char *buf = malloc((size_t)sz + 1);
	if (!buf) {
		errno = ENOMEM;
		return -1;
	}

	ssize_t r = lgetxattr(path, SELINUX_XATTR, buf, (size_t)sz);
	if (r < 0) {
		LOGW("getcon %s (read): %s", path, strerror(errno));
		free(buf);
		return -1;
	}
	buf[r] = '\0';
	*out = buf;

	LOGD("lgetfilecon(%s) -> \"%s\"", path, buf);
#else
	LOGD("lgetfilecon(%s) skipped (no SELinux on this platform)",
	     path ? path : "(null)");
	UNUSED(path);
#endif
	return 0;
}

/*==============================================================================
 * Node 结构 & 模块扫描
 *============================================================================*/

typedef enum {
	NFT_REGULAR,
	NFT_DIRECTORY,
	NFT_SYMLINK,
	NFT_WHITEOUT
} NodeFileType;

typedef struct Node {
	char *name;
	NodeFileType type;
	struct Node **children;
	size_t child_count;
	char *module_path; // 在模块中的完整路径
	char *module_name; // 模块名（目录名），例如 "foo"
	bool replace;
	bool skip;
	bool done;
} Node;

static Node *node_new(const char *name, NodeFileType t)
{
	Node *n = calloc(1, sizeof(Node));
	if (!n)
		return NULL;

	n->name = strdup(name ? name : "");
	n->type = t;
	return n;
}

static void node_free(Node *n)
{
	if (!n)
		return;

	for (size_t i = 0; i < n->child_count; ++i)
		node_free(n->children[i]);

	free(n->children);
	free(n->name);
	free(n->module_path);
	free(n->module_name);
	free(n);
}

static NodeFileType node_type_from_stat(const struct stat *st)
{
	if (S_ISCHR(st->st_mode) && st->st_rdev == 0)
		return NFT_WHITEOUT;
	if (S_ISREG(st->st_mode))
		return NFT_REGULAR;
	if (S_ISDIR(st->st_mode))
		return NFT_DIRECTORY;
	if (S_ISLNK(st->st_mode))
		return NFT_SYMLINK;
	return NFT_WHITEOUT;
}

static bool dir_is_replace(const char *path)
{
	char buf[8];
	ssize_t len = lgetxattr(path, REPLACE_DIR_XATTR, buf, sizeof(buf) - 1);
	if (len <= 0)
		return false;

	buf[len] = '\0';
	return (strcmp(buf, "y") == 0);
}

/* module_name 为模块名，例如 "foo" */
static Node *node_new_module(const char *name, const char *path,
			     const char *module_name)
{
	struct stat st;
	if (lstat(path, &st) < 0)
		return NULL;

	if (!(S_ISCHR(st.st_mode) || S_ISREG(st.st_mode) ||
	      S_ISDIR(st.st_mode) || S_ISLNK(st.st_mode)))
		return NULL;

	NodeFileType t = node_type_from_stat(&st);
	Node *n = node_new(name, t);
	if (!n)
		return NULL;

	n->module_path = strdup(path);
	if (module_name)
		n->module_name = strdup(module_name);
	n->replace = (t == NFT_DIRECTORY) && dir_is_replace(path);

	g_stats.nodes_total++;
	return n;
}

static int node_add_child(Node *parent, Node *child)
{
	Node **arr = realloc(parent->children,
			     (parent->child_count + 1) * sizeof(Node *));
	if (!arr) {
		errno = ENOMEM;
		return -1;
	}

	parent->children = arr;
	parent->children[parent->child_count++] = child;
	return 0;
}

static Node *node_find_child(Node *parent, const char *name)
{
	for (size_t i = 0; i < parent->child_count; ++i) {
		if (strcmp(parent->children[i]->name, name) == 0)
			return parent->children[i];
	}
	return NULL;
}

static Node *node_take_child(Node *parent, const char *name)
{
	for (size_t i = 0; i < parent->child_count; ++i) {
		if (strcmp(parent->children[i]->name, name) == 0) {
			Node *n = parent->children[i];
			memmove(&parent->children[i], &parent->children[i + 1],
				(parent->child_count - i - 1) * sizeof(Node *));
			parent->child_count--;
			return n;
		}
	}
	return NULL;
}

static bool module_disabled(const char *mod_dir)
{
	char buf[PATH_MAX];

	path_join(mod_dir, DISABLE_FILE_NAME, buf, sizeof(buf));
	if (path_exists(buf))
		return true;

	path_join(mod_dir, REMOVE_FILE_NAME, buf, sizeof(buf));
	if (path_exists(buf))
		return true;

	path_join(mod_dir, SKIP_MOUNT_FILE_NAME, buf, sizeof(buf));
	if (path_exists(buf))
		return true;

	return false;
}

/* 递归收集模块文件，module_name 为模块名 */
static int node_collect(Node *self, const char *dir, const char *module_name,
			bool *has_any)
{
	DIR *d = opendir(dir);
	if (!d) {
		LOGE("opendir %s: %s", dir, strerror(errno));
		return -1;
	}

	struct dirent *de;
	bool any = false;
	char path[PATH_MAX];

	while ((de = readdir(d))) {
		if (!strcmp(de->d_name, ".") || !strcmp(de->d_name, ".."))
			continue;

		if (path_join(dir, de->d_name, path, sizeof(path)) != 0) {
			closedir(d);
			return -1;
		}

		Node *child = node_find_child(self, de->d_name);
		if (!child) {
			Node *n =
				node_new_module(de->d_name, path, module_name);
			if (n) {
				if (node_add_child(self, n) != 0) {
					node_free(n);
					closedir(d);
					return -1;
				}
				child = n;
			}
		}

		if (child) {
			if (child->type == NFT_DIRECTORY) {
				bool sub = false;
				if (node_collect(child, path, module_name,
						 &sub) != 0) {
					closedir(d);
					return -1;
				}
				if (sub || child->replace)
					any = true;
			} else {
				any = true;
			}
		}
	}

	closedir(d);
	*has_any = any;
	return 0;
}

static Node *collect_root(void)
{
	const char *mdir = g_module_dir;
	Node *root = node_new("", NFT_DIRECTORY);
	Node *system = node_new("system", NFT_DIRECTORY);

	if (!root || !system) {
		node_free(root);
		node_free(system);
		return NULL;
	}

	DIR *d = opendir(mdir);
	if (!d) {
		LOGE("opendir %s: %s", mdir, strerror(errno));
		node_free(root);
		node_free(system);
		return NULL;
	}

	struct dirent *de;
	bool has_any = false;
	char mod[PATH_MAX];
	char mod_sys[PATH_MAX];

	while ((de = readdir(d))) {
		if (!strcmp(de->d_name, ".") || !strcmp(de->d_name, ".."))
			continue;

		if (path_join(mdir, de->d_name, mod, sizeof(mod)) != 0) {
			closedir(d);
			node_free(root);
			node_free(system);
			return NULL;
		}

		struct stat st;
		if (stat(mod, &st) < 0 || !S_ISDIR(st.st_mode))
			continue;

		if (module_disabled(mod))
			continue;

		if (path_join(mod, "system", mod_sys, sizeof(mod_sys)) != 0) {
			closedir(d);
			node_free(root);
			node_free(system);
			return NULL;
		}

		if (!path_is_dir(mod_sys))
			continue;

		LOGD("collecting module %s", de->d_name);
		g_stats.modules_total++;

		bool sub = false;
		if (node_collect(system, mod_sys, de->d_name, &sub) != 0) {
			closedir(d);
			node_free(root);
			node_free(system);
			return NULL;
		}
		if (sub)
			has_any = true;
	}

	closedir(d);

	if (!has_any) {
		node_free(root);
		node_free(system);
		return NULL;
	}

	/* root 和 system 自身也计入节点数 */
	g_stats.nodes_total += 2;

	/*
     * 内置分区：
     *   vendor, system_ext, product, odm
     * 其中前三个要求 /system/<name> 是 symlink。
     * 额外分区（-p）行为类似 odm：只检查 /<name> 是否为目录。
     */
	struct {
		const char *name;
		bool need_symlink;
	} builtin_parts[] = {
		{ "vendor", true },
		{ "system_ext", true },
		{ "product", true },
		{ "odm", false },
	};

	char rp[PATH_MAX];
	char sp[PATH_MAX];

	// builtin 分区
	for (size_t i = 0; i < sizeof(builtin_parts) / sizeof(builtin_parts[0]);
	     ++i) {
		if (path_join("/", builtin_parts[i].name, rp, sizeof(rp)) !=
			    0 ||
		    path_join("/system", builtin_parts[i].name, sp,
			      sizeof(sp)) != 0) {
			node_free(root);
			node_free(system);
			return NULL;
		}

		if (!path_is_dir(rp))
			continue;

		if (builtin_parts[i].need_symlink && !path_is_symlink(sp))
			continue;

		Node *child = node_take_child(system, builtin_parts[i].name);
		if (child && node_add_child(root, child) != 0) {
			node_free(child);
			node_free(root);
			node_free(system);
			return NULL;
		}
	}

	// 额外分区（行为类似 odm）
	for (int i = 0; i < g_extra_parts_count; ++i) {
		const char *name = g_extra_parts[i];

		if (path_join("/", name, rp, sizeof(rp)) != 0) {
			node_free(root);
			node_free(system);
			return NULL;
		}

		if (!path_is_dir(rp))
			continue;

		Node *child = node_take_child(system, name);
		if (child && node_add_child(root, child) != 0) {
			node_free(child);
			node_free(root);
			node_free(system);
			return NULL;
		}
	}

	if (node_add_child(root, system) != 0) {
		node_free(root);
		node_free(system);
		return NULL;
	}

	return root;
}

/*==============================================================================
 * magic mount 挂载逻辑
 *============================================================================*/

static int clone_symlink(const char *src, const char *dst)
{
	char target[PATH_MAX];

	ssize_t len = readlink(src, target, sizeof(target) - 1);
	if (len < 0) {
		LOGE("readlink %s: %s", src, strerror(errno));
		return -1;
	}

	target[len] = '\0';

	if (symlink(target, dst) < 0) {
		LOGE("symlink %s->%s: %s", dst, target, strerror(errno));
		return -1;
	}

	char *con = NULL;
	if (lgetfilecon(src, &con) == 0 && con) {
		lsetfilecon(dst, con);
		free(con);
	}

	LOGD("clone symlink %s -> %s (%s)", src, dst, target);
	return 0;
}

static int mirror(const char *path, const char *work, const char *name);

static int do_magic(const char *base, const char *wbase, Node *node,
		    bool has_tmpfs)
{
	char path[PATH_MAX];
	char wpath[PATH_MAX];

	if (path_join(base, node->name, path, sizeof(path)) != 0 ||
	    path_join(wbase, node->name, wpath, sizeof(wpath)) != 0)
		return -1;

	switch (node->type) {
	case NFT_REGULAR: {
		const char *target = has_tmpfs ? wpath : path;

		if (has_tmpfs) {
			if (mkdir_p(wbase) != 0)
				return -1;

			int fd = open(wpath, O_CREAT | O_WRONLY, 0644);
			if (fd < 0) {
				LOGE("create %s: %s", wpath, strerror(errno));
				return -1;
			}
			close(fd);
		}

		if (!node->module_path) {
			LOGE("no module file for %s", path);
			errno = EINVAL;
			return -1;
		}

		LOGD("bind %s -> %s", node->module_path, target);

		if (mount(node->module_path, target, NULL, MS_BIND, NULL) < 0) {
			LOGE("bind %s->%s: %s", node->module_path, target,
			     strerror(errno));
			return -1;
		} else
			if (!strstr(target, ".magic_mount/workdir/")) { send_unmountable(target); } // tell ksu about this mount

		(void)mount(NULL, target, NULL,
			    MS_REMOUNT | MS_BIND | MS_RDONLY, NULL);

		g_stats.nodes_mounted++;
		return 0;
	}

	case NFT_SYMLINK: {
		if (!node->module_path) {
			LOGE("no module symlink for %s", path);
			errno = EINVAL;
			return -1;
		}

		if (clone_symlink(node->module_path, wpath) != 0)
			return -1;

		g_stats.nodes_mounted++;
		return 0;
	}

	case NFT_WHITEOUT:
		LOGD("whiteout %s", path);
		g_stats.nodes_whiteout++;
		return 0;

	case NFT_DIRECTORY: {
		bool create_tmp =
			(!has_tmpfs && node->replace && node->module_path);

		if (!has_tmpfs && !create_tmp) {
			for (size_t i = 0; i < node->child_count; ++i) {
				Node *c = node->children[i];
				char rp[PATH_MAX];

				if (path_join(path, c->name, rp, sizeof(rp)) !=
				    0)
					return -1;

				bool need = false;

				if (c->type == NFT_SYMLINK) {
					need = true;
				} else if (c->type == NFT_WHITEOUT) {
					need = path_exists(rp);
				} else {
					struct stat st;
					if (lstat(rp, &st) == 0) {
						NodeFileType rt =
							node_type_from_stat(
								&st);
						if (rt != c->type ||
						    rt == NFT_SYMLINK)
							need = true;
					} else {
						need = true;
					}
				}

				if (need) {
					if (!node->module_path) {
						LOGE("cannot create tmpfs on %s (%s)",
						     path, c->name);
						c->skip = true;
						g_stats.nodes_skipped++;
						continue;
					}
					create_tmp = true;
					break;
				}
			}
		}

		bool now_tmp = has_tmpfs || create_tmp;

		if (now_tmp) {
			if (mkdir_p(wpath) != 0)
				return -1;

			struct stat st;
			const char *meta_path = NULL;

			if (stat(path, &st) == 0) {
				meta_path = path;
			} else if (node->module_path &&
				   stat(node->module_path, &st) == 0) {
				meta_path = node->module_path;
			} else {
				LOGE("no dir meta for %s", path);
				errno = ENOENT;
				return -1;
			}

			chmod(wpath, st.st_mode & 07777);
			chown(wpath, st.st_uid, st.st_gid);

			char *con = NULL;
			if (lgetfilecon(meta_path, &con) == 0 && con) {
				lsetfilecon(wpath, con);
				free(con);
			}
		}

		if (create_tmp) {
			if (mount(wpath, wpath, NULL, MS_BIND, NULL) < 0) {
				LOGE("bind self %s: %s", wpath,
				     strerror(errno));
				return -1;
			}
		}

		if (path_exists(path) && !node->replace) {
			DIR *d = opendir(path);
			if (!d) {
				LOGE("opendir %s: %s", path, strerror(errno));
				if (now_tmp)
					return -1;
			} else {
				struct dirent *de;
				while ((de = readdir(d))) {
					if (!strcmp(de->d_name, ".") ||
					    !strcmp(de->d_name, "..")) {
						continue;
					}

					Node *c = node_find_child(node,
								  de->d_name);
					int r = 0;

					if (c) {
						if (c->skip) {
							c->done = true;
							continue;
						}
						c->done = true;
						r = do_magic(path, wpath, c,
							     now_tmp);
					} else if (now_tmp) {
						r = mirror(path, wpath,
							   de->d_name);
					}

					if (r != 0) {
						const char *mn = NULL;

						if (c && c->module_name)
							mn = c->module_name;
						else if (node->module_name)
							mn = node->module_name;

						if (mn) {
							LOGE("child %s/%s failed (module: %s)",
							     path,
							     c ? c->name :
								 de->d_name,
							     mn);
							register_module_failure(
								mn);
						} else {
							LOGE("child %s/%s failed (no module_name)",
							     path,
							     c ? c->name :
								 de->d_name);
						}

						g_stats.nodes_fail++;

						if (now_tmp) {
							closedir(d);
							return -1;
						}
					}
				}
				closedir(d);
			}
		}

		for (size_t i = 0; i < node->child_count; ++i) {
			Node *c = node->children[i];
			if (c->skip || c->done)
				continue;

			int r = do_magic(path, wpath, c, now_tmp);
			if (r != 0) {
				const char *mn = c->module_name ?
							 c->module_name :
							 node->module_name;

				if (mn) {
					LOGE("child %s/%s failed (module: %s)",
					     path, c->name, mn);
					register_module_failure(mn);
				} else {
					LOGE("child %s/%s failed (no module_name)",
					     path, c->name);
				}

				g_stats.nodes_fail++;
				if (now_tmp)
					return -1;
			}
		}

		if (create_tmp) {
			(void)mount(NULL, wpath, NULL,
				    MS_REMOUNT | MS_BIND | MS_RDONLY, NULL);

			if (mount(wpath, path, NULL, MS_MOVE, NULL) < 0) {
				LOGE("move %s->%s failed: %s", wpath, path,
				     strerror(errno));
				if (node->module_name)
					register_module_failure(
						node->module_name);
				return -1;
			}

			LOGI("move mountpoint success: %s -> %s", wpath, path);
			(void)mount(NULL, path, NULL, MS_REC | MS_PRIVATE, NULL);
			
			// tell ksu about this one too
			send_unmountable(path);
		}

		g_stats.nodes_mounted++;
		return 0;
	}
	}

	return 0;
}

static int mirror(const char *path, const char *work, const char *name)
{
	char src[PATH_MAX];
	char dst[PATH_MAX];

	if (path_join(path, name, src, sizeof(src)) != 0 ||
	    path_join(work, name, dst, sizeof(dst)) != 0)
		return -1;

	struct stat st;
	if (lstat(src, &st) < 0) {
		LOGW("lstat %s: %s", src, strerror(errno));
		return 0; // 忽略
	}

	if (S_ISREG(st.st_mode)) {
		int fd = open(dst, O_CREAT | O_WRONLY, st.st_mode & 07777);
		if (fd < 0) {
			LOGE("create %s: %s", dst, strerror(errno));
			return -1;
		}
		close(fd);

		if (mount(src, dst, NULL, MS_BIND, NULL) < 0) {
			LOGE("bind %s->%s: %s", src, dst, strerror(errno));
			return -1;
		}
	} else if (S_ISDIR(st.st_mode)) {
		if (mkdir(dst, st.st_mode & 07777) < 0 && errno != EEXIST) {
			LOGE("mkdir %s: %s", dst, strerror(errno));
			return -1;
		}

		chmod(dst, st.st_mode & 07777);
		chown(dst, st.st_uid, st.st_gid);

		char *con = NULL;
		if (lgetfilecon(src, &con) == 0 && con) {
			lsetfilecon(dst, con);
			free(con);
		}

		DIR *d = opendir(src);
		if (!d) {
			LOGE("opendir %s: %s", src, strerror(errno));
			return -1;
		}

		struct dirent *de;
		while ((de = readdir(d))) {
			if (!strcmp(de->d_name, ".") ||
			    !strcmp(de->d_name, "..")) {
				continue;
			}
			if (mirror(src, dst, de->d_name) != 0) {
				closedir(d);
				return -1;
			}
		}
		closedir(d);
	} else if (S_ISLNK(st.st_mode)) {
		if (clone_symlink(src, dst) != 0)
			return -1;
	}

	return 0;
}

static int magic_mount(const char *tmp_root)
{
	Node *root = collect_root();
	if (!root) {
		LOGI("no modules, magic_mount skipped");
		return 0;
	}

	char tmp_dir[PATH_MAX];
	if (path_join(tmp_root, "workdir", tmp_dir, sizeof(tmp_dir)) != 0) {
		node_free(root);
		return -1;
	}

	if (mkdir_p(tmp_dir) != 0) {
		node_free(root);
		return -1;
	}
	
	grab_fd();

	LOGI("starting magic_mount core logic: tmpfs_source=%s tmp_dir=%s",
	     g_mount_source, tmp_dir);

	if (mount(g_mount_source, tmp_dir, "tmpfs", 0, "") < 0) {
		LOGE("mount tmpfs %s: %s", tmp_dir, strerror(errno));
		node_free(root);
		return -1;
	}

	(void)mount(NULL, tmp_dir, NULL, MS_REC | MS_PRIVATE, NULL);

	int rc = do_magic("/", tmp_dir, root, false);
	if (rc != 0)
		g_stats.nodes_fail++;

	if (umount2(tmp_dir, MNT_DETACH) < 0)
		LOGE("umount %s: %s", tmp_dir, strerror(errno));

	(void)rmdir(tmp_dir);

	node_free(root);
	return rc;
}

/*==============================================================================
 * 进程环境 & CLI
 *============================================================================*/

static void usage(const char *prog)
{
	fprintf(stderr,
		"Magic Mount Version: %s\n"
		"Usage: %s [options]\n"
		"  -m DIR     module dir (default: %s)\n"
		"  -t DIR     temp dir   (default: auto rw tmpfs + \".magic_mount\")\n"
		"  -s SRC     mount src  (default: %s)\n"
		"  -p LIST    extra partitions, comma-separated (e.g. mi_ext,my_stock)\n"
		"  -l FILE    log file   (default: stderr, '-'=stdout)\n"
		"  -v N       verbose    (0=ERROR,1=WARN,2=INFO,3=DEBUG)\n"
		"  -h         help\n",
		MAGIC_MOUNT_VERSION, prog, DEFAULT_MODULE_DIR,
		DEFAULT_MOUNT_SOURCE);
}

static int enter_pid1_ns(void)
{
	int fd = open("/proc/1/ns/mnt", O_RDONLY);
	if (fd < 0) {
		LOGE("open /proc/1/ns/mnt: %s", strerror(errno));
		return -1;
	}

	if (setns(fd, 0) < 0) {
		LOGE("setns: %s", strerror(errno));
		close(fd);
		return -1;
	}

	close(fd);
	LOGI("entered pid1 mnt ns");
	return 0;
}

int main(int argc, char **argv)
{
	const char *tmp_dir = NULL;
	const char *log_path = NULL;
	char auto_tmp[PATH_MAX] = { 0 };

	for (int i = 1; i < argc; ++i) {
		const char *arg = argv[i];

		if ((strcmp(arg, "-m") == 0 ||
		     strcmp(arg, "--module-dir") == 0) &&
		    i + 1 < argc) {
			g_module_dir = argv[++i];

		} else if ((strcmp(arg, "-t") == 0 ||
			    strcmp(arg, "--temp-dir") == 0) &&
			   i + 1 < argc) {
			tmp_dir = argv[++i];

		} else if ((strcmp(arg, "-s") == 0 ||
			    strcmp(arg, "--mount-source") == 0) &&
			   i + 1 < argc) {
			g_mount_source = argv[++i];

		} else if ((strcmp(arg, "-l") == 0 ||
			    strcmp(arg, "--log-file") == 0) &&
			   i + 1 < argc) {
			log_path = argv[++i];

		} else if ((strcmp(arg, "-v") == 0 ||
			    strcmp(arg, "--verbose") == 0) &&
			   i + 1 < argc) {
			g_log_level = atoi(argv[++i]);
			if (g_log_level < 0)
				g_log_level = 0;
			if (g_log_level > 3)
				g_log_level = 3;

		} else if ((strcmp(arg, "-p") == 0 ||
			    strcmp(arg, "--partitions") == 0) &&
			   i + 1 < argc) {
			const char *list = argv[++i];
			const char *p = list;
			while (*p) {
				const char *start = p;
				while (*p && *p != ',')
					p++;
				size_t len = (size_t)(p - start);
				add_extra_part_token(start, len);
				if (*p == ',')
					p++;
			}

		} else if (!strcmp(arg, "-h") || !strcmp(arg, "--help")) {
			usage(argv[0]);
			return 0;

		} else {
			fprintf(stderr, "Unknown arg: %s\n", arg);
			usage(argv[0]);
			return 1;
		}
	}

	if (log_path) {
		if (!strcmp(log_path, "-")) {
			g_log_file = stdout;
		} else {
			g_log_file = fopen(log_path, "a");
			if (!g_log_file) {
				fprintf(stderr, "open log %s: %s\n", log_path,
					strerror(errno));
				return 1;
			}
		}
	}

	if (!tmp_dir) {
		tmp_dir = select_auto_tempdir(auto_tmp);
	}

	if (geteuid() != 0) {
		LOGE("must run as root (euid=%d)", (int)geteuid());
		if (g_log_file && g_log_file != stdout && g_log_file != stderr)
			fclose(g_log_file);
		free_string_array(&g_extra_parts, &g_extra_parts_count);
		return 1;
	}

	if (enter_pid1_ns() != 0) {
		if (g_log_file && g_log_file != stdout && g_log_file != stderr)
			fclose(g_log_file);
		free_string_array(&g_extra_parts, &g_extra_parts_count);
		return 1;
	}

	int rc = 0;

	LOGI("starting magic_mount process: module_dir=%s temp_dir=%s "
	     "mount_source=%s log_level=%d",
	     g_module_dir, tmp_dir, g_mount_source, g_log_level);

	rc = magic_mount(tmp_dir);

	if (rc == 0) {
		LOGI("magic_mount completed successfully");
	} else {
		LOGE("magic_mount failed with rc=%d "
		     "(check previous logs for details)",
		     rc);
	}

	LOGI("magic_mount summary: modules=%d nodes_total=%d mounted=%d "
	     "skipped=%d whiteouts=%d failures=%d",
	     g_stats.modules_total, g_stats.nodes_total, g_stats.nodes_mounted,
	     g_stats.nodes_skipped, g_stats.nodes_whiteout, g_stats.nodes_fail);

	if (g_failed_modules_count > 0) {
		LOGW("modules with failures (%d):", g_failed_modules_count);
		for (int i = 0; i < g_failed_modules_count; ++i) {
			LOGW("  failed module: %s", g_failed_modules[i]);
		}
	}

	if (g_log_file && g_log_file != stdout && g_log_file != stderr)
		fclose(g_log_file);

	free_string_array(&g_failed_modules, &g_failed_modules_count);
	free_string_array(&g_extra_parts, &g_extra_parts_count);

	return rc == 0 ? 0 : 1;
}
