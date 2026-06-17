import { toast } from 'kernelsu';
import { gsap } from 'gsap';
import { run, escapeHtml } from '../../utils.js';
import { config } from '../../core/constants.js';

// Custom sus_kstat management
export async function custom_kstat_editor() {
	const edit_kstat_entry_label=document.getElementById("edit_kstat_entry_label_id");
	const add_kstat_entry_label=document.getElementById("add_kstat_entry_label_id");
	const kstatList = document.getElementById("kstat_entries_list");
	const addBtn = document.getElementById("add_kstat_entry");
	const editModal = document.getElementById("kstat_edit_modal");
	const saveBtn = document.getElementById("save_kstat_entry");
	const modalBox = editModal ? editModal.querySelector(".modal-box") : null;
	const confirm_del_kstat_modal = document.getElementById("confirm_del_kstat_modal");
	const modal_kstat_del_message = document.getElementById("modal_kstat_del_message");
	const confirmDelBtn = document.getElementById("confirm_del_kstat");
	const cancelDelBtn = document.getElementById("cancel_del_kstat");

	const fields = {
		path: document.getElementById("kstat_path_input"),
		ino: document.getElementById("kstat_ino_input"),
		dev: document.getElementById("kstat_dev_input"),
		nlink: document.getElementById("kstat_nlink_input"),
		size: document.getElementById("kstat_size_input"),
		atime: document.getElementById("kstat_atime_input"),
		mtime: document.getElementById("kstat_mtime_input"),
		ctime: document.getElementById("kstat_ctime_input"),
		atime_nsec: document.getElementById("kstat_atime_nsec_input"),
		mtime_nsec: document.getElementById("kstat_mtime_nsec_input"),
		ctime_nsec: document.getElementById("kstat_ctime_nsec_input"),
		blocks: document.getElementById("kstat_blocks_input"),
		blksize: document.getElementById("kstat_blksize_input"),
	};

	let currentEditingIndex = null;
	let kstatData = [];
	console.log("Initializing custom kstat editor with config");

	// Keep lower fields visible on mobile when keyboard is open.
	const kstatFieldElements = Object.values(fields).filter(Boolean);
	const getKeyboardPadding = () => {
		if (window.visualViewport) {
			const keyboardHeight = window.innerHeight - window.visualViewport.height;
			if (keyboardHeight > 0) {
				return Math.min(Math.max(keyboardHeight + 32, 260), 420);
			}
		}
		return 320;
	};

	const focusKstatField = (el) => {
		if (!modalBox) return;
		const padding = `${getKeyboardPadding()}px`;
		modalBox.style.paddingBottom = padding;
		modalBox.style.overflowY = "auto";
		setTimeout(() => {
			el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
		}, 120);
	};

	const blurKstatField = () => {
		if (!modalBox) return;
		setTimeout(() => {
			if (kstatFieldElements.includes(document.activeElement)) return;
			gsap.to(modalBox, {
				duration: 0.35,
				paddingBottom: "1.5rem",
				ease: "power1.out"
			});
		}, 0);
	};

	kstatFieldElements.forEach((el) => {
		el.addEventListener("focus", () => focusKstatField(el));
		el.addEventListener("blur", blurKstatField);
	});

	if (editModal) {
		editModal.addEventListener("close", () => {
			if (!modalBox) return;
			modalBox.style.paddingBottom = "1.5rem";
			modalBox.style.overflowY = "";
		});
	}

	// Load initial data
	// Load sus_kstat data from file
	try {
		const content = await run(`[ -f ${config}/sus_kstat_statically.json ] && cat ${config}/sus_kstat_statically.json || echo "[]"`);
		kstatData = JSON.parse(content);
		console.log("Loaded kstat data:", kstatData);
		console.log("Loaded content:", content);
	} catch (error) {
		console.error("Error loading kstat data:", error);
		kstatData = [];
	}

	// Render the list of entries
	const renderKstatList = () => {
		kstatList.innerHTML = kstatData.map((entry, index) => `
			<div class="flex justify-between items-center p-3 bg-cyan-100/10 border border-cyan-200/30 rounded font-sans normal-case">
				<div class="flex-grow min-w-0 overflow-hidden">
					<p class="text-white font-bold text-sm truncate min-w-0 w-full overflow-hidden">${escapeHtml(entry.path)}</p>
					<p class="text-cyan-300 text-xs">ino: ${entry.ino} | dev: ${entry.dev} | size: ${entry.size}</p>
				</div>
				<div class="flex gap-2 flex-shrink-0">
					<button class="btn btn-ghost btn-sm p-2 text-white hover:bg-cyan-500/30" onclick="editKstatEntry(${index})">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
						</svg>
					</button>
					<button class="btn btn-ghost btn-sm p-2 text-white hover:bg-red-500/30" onclick="deleteKstatEntry(${index})">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3H4v2h16V7h-3z"></path>
						</svg>
					</button>
				</div>
			</div>
		`).join("");
	};

	renderKstatList();

	// Add button handler
	addBtn.addEventListener("click", () => {
		currentEditingIndex = null;
		fields.path.value = "";
		fields.ino.value = "";
		fields.dev.value = "";
		fields.nlink.value = "";
		fields.size.value = "";
		fields.atime.value = "";
    	fields.mtime.value = "";
    	fields.ctime.value = "";
		fields.atime_nsec.value = "";
		fields.mtime_nsec.value = "";
		fields.ctime_nsec.value = "";
		fields.blocks.value = "";
		fields.blksize.value = "";
		edit_kstat_entry_label.classList.add("hidden");
		add_kstat_entry_label.classList.remove("hidden");
		editModal.showModal();
	});

	// Open edit modal for new or existing entry
	window.editKstatEntry = (index) => {
		currentEditingIndex = index;
		const entry = kstatData[index];

		fields.path.value = entry.path;
		fields.ino.value = entry.ino;
		fields.dev.value = entry.dev;
		fields.nlink.value = entry.nlink;
		fields.size.value = entry.size;
		fields.atime.value = entry.atime;
		fields.mtime.value = entry.mtime;
		fields.ctime.value = entry.ctime;
		fields.atime_nsec.value = entry.atime_nsec;
		fields.mtime_nsec.value = entry.mtime_nsec;
		fields.ctime_nsec.value = entry.ctime_nsec;
		fields.blocks.value = entry.blocks;
		fields.blksize.value = entry.blksize;
		add_kstat_entry_label.classList.add("hidden");
		edit_kstat_entry_label.classList.remove("hidden");
		editModal.showModal();
	};

	// Delete entry with confirmation
	window.deleteKstatEntry = async (index) => {
		modal_kstat_del_message.innerText += ` ${kstatData[index].path}?`;
		confirm_del_kstat_modal.showModal();
		confirmDelBtn.onclick = async () => {
			modal_kstat_del_message.innerText = modal_kstat_del_message.innerText.replace(` ${kstatData[index].path}?`, "");
			kstatData.splice(index, 1);
			await saveKstatData();
			renderKstatList();
			toast("Entry deleted and saved");
			confirm_del_kstat_modal.close();
		};
		cancelDelBtn.onclick = () => {
			confirm_del_kstat_modal.close();
			modal_kstat_del_message.innerText = modal_kstat_del_message.innerText.replace(` ${kstatData[index].path}?`, "");
		};
	};

	// Save entry from modal
	const saveKstatEntry = async () => {
		const newEntry = {
			path: fields.path.value.trim(),
			ino: fields.ino.value ? fields.ino.value.trim() : "default",
			dev: fields.dev.value ? fields.dev.value.trim() : "default",
			nlink: fields.nlink.value ? fields.nlink.value.trim() : "default",
			size: fields.size.value ? fields.size.value.trim() : "default",
			atime: fields.atime.value ? fields.atime.value.trim() : "default",
			mtime: fields.mtime.value ? fields.mtime.value.trim() : "default",
			ctime: fields.ctime.value ? fields.ctime.value.trim() : "default",
			atime_nsec: fields.atime_nsec.value ? fields.atime_nsec.value.trim() : "default",
			mtime_nsec: fields.mtime_nsec.value ? fields.mtime_nsec.value.trim() : "default",
			ctime_nsec: fields.ctime_nsec.value ? fields.ctime_nsec.value.trim() : "default",
			blocks: fields.blocks.value ? fields.blocks.value.trim() : "default",
			blksize: fields.blksize.value ? fields.blksize.value.trim() : "default"
		};

		// Validation
		if (!newEntry.path) {
			toast("Path is required!");
			return;
		}

		if (currentEditingIndex !== null) {
			kstatData[currentEditingIndex] = newEntry;
			toast("Entry updated");
		} else {
			kstatData.push(newEntry);
			toast("Entry added");
		}

		currentEditingIndex = null;
		await saveKstatData();
		renderKstatList();
		editModal.close();
	};

	// Save kstat data to file
	const saveKstatData = async () => {
		try {
			const jsonContent = JSON.stringify(kstatData, null, 2);
			await run(`cat > ${config}/sus_kstat_statically.json << 'EOF'\n${jsonContent}\nEOF`);
		} catch (error) {
			console.error("Error saving kstat data:", error);
			toast("Failed to save kstat data");
		}
	};

	// Save button handler
	saveBtn.addEventListener("click", async () => {
		await saveKstatEntry();
	});
}
