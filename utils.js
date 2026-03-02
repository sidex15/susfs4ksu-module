import { toast } from 'kernelsu';

/**
 * Execute a shell command via KernelSU
 * @param {string} command - The shell command to execute
 * @returns {Promise<string>} A promise that resolves with stdout content
 */
export async function run(command) {
    return new Promise((resolve, reject) => {
        const callbackName = `exec_callback_${Date.now()}`;
        window[callbackName] = (errno, stdout, stderr) => {
            delete window[callbackName];
            if (errno === 0) {
                resolve(stdout);
            } else {
                console.error(`Error executing command: ${stderr}`);
                reject(stderr);
            }
        };
        try {
            ksu.exec(command, "{}", callbackName);
        } catch (error) {
            console.error(`Execution error: ${error}`);
            reject(error);
        }
    });
}

/**
 * Parse shell config file content (key=value pairs) into a JS object
 * @param {string} content - Raw config file content
 * @returns {Object} Parsed key-value pairs
 */
export function catToObject(content) {
    return content
        .split('\n')
        .filter(line => line.includes('='))
        .reduce((acc, line) => {
            const [key, ...rest] = line.split('=');
            const value = rest.join('=').trim();
            const trimmedKey = key.trim();

            if ((value.startsWith("'") && value.endsWith("'")) ||
                (value.startsWith('"') && value.endsWith('"'))) {
                acc[trimmedKey] = value.slice(1, -1);
            } else {
                acc[trimmedKey] = isNaN(Number(value)) ? value : Number(value);
            }

            return acc;
        }, {});
}

/**
 * Parse a version string like "v1.5.3-variant" into { main, sub, patch }
 * @param {string} versionStr - Raw version string
 * @returns {{ main: number, sub: number, patch: number }}
 */
export function parseVersion(versionStr) {
    const parts = versionStr.split('-')[0].replace(/^v/, '').split('.');
    return {
        main: parseInt(parts[0]) || 0,
        sub: parseInt(parts[1]) || 0,
        patch: parseInt(parts[2]) || 0,
    };
}

/**
 * Compare a version object against a minimum required version.
 * Properly handles all version components (e.g., 1.6.0 >= 1.5.3).
 * @param {{ main: number, sub: number, patch: number }} v - Current version
 * @param {number} major - Minimum major version
 * @param {number} minor - Minimum minor version
 * @param {number} patch - Minimum patch version
 * @returns {boolean} True if current version >= specified version
 */
export function versionAtLeast(v, major, minor, patch) {
    if (v.main !== major) return v.main > major;
    if (v.sub !== minor) return v.sub > minor;
    return v.patch >= patch;
}

/**
 * Update a config value in a shell config file using sed
 * @param {string} configPath - Path to the config file
 * @param {string} key - Config key to update
 * @param {*} value - New value
 */
export async function updateConfig(configPath, key, value) {
    await run(`sed -i 's/${key}=.*/${key}=${value}/' ${configPath}`);
}

/**
 * Create a load/save handler for text area sections
 * @param {Object} options
 * @param {HTMLElement} options.loadBtn - Load button element
 * @param {HTMLElement} options.saveBtn - Save button element
 * @param {HTMLElement} options.textarea - Textarea element
 * @param {string} options.filePath - Path to the backing file
 * @param {string} options.featureName - Display name for toast messages
 */
export function setupTextArea({ loadBtn, saveBtn, textarea, filePath, featureName }) {
    loadBtn.addEventListener("click", async () => {
        textarea.innerHTML = await run(`cat ${filePath}`);
    });

    saveBtn.addEventListener("click", async () => {
        const value = textarea.value;
        if (value === '') {
            toast('please press load first!');
        } else {
            await run(`echo '${value}' > ${filePath}`);
            toast(`Custom ${featureName} saved!`);
            toast("Reboot to take effect");
        }
    });
}

/**
 * Create a simple boolean toggle handler that updates config via sed
 * @param {HTMLElement} element - Toggle/checkbox element
 * @param {Object} settings - Settings object (mutated on toggle)
 * @param {string} key - Settings key to toggle
 * @param {string} configPath - Config file path
 * @param {Object} [options] - Additional options
 */
export function setupBooleanToggle(element, settings, key, configPath, {
    onMessage = "Reboot to take effect",
    offMessage = "Reboot to take effect",
    onAction = null,
    offAction = null,
} = {}) {
    element.addEventListener("click", async function () {
        if (settings[key] === true || settings[key] === 1) {
            await run(`sed -i 's/${key}=.*/${key}=0/' ${configPath}`);
            settings[key] = false;
            if (offAction) await offAction();
            toast(offMessage);
        } else {
            await run(`sed -i 's/${key}=.*/${key}=1/' ${configPath}`);
            settings[key] = true;
            if (onAction) await onAction();
            toast(onMessage);
        }
    });
}
