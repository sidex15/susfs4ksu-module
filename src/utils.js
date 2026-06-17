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
 * Create a simple boolean toggle handler that updates config via sed
 * @param {HTMLElement} element - Toggle/checkbox element
 * @param {Object} settings - Settings object (mutated on toggle)
 * @param {string} key - Settings key to toggle
 * @param {string} configPath - Config file path
 * @param {int} onstate - Value representing "on" state (e.g., 1 or true)
 * @param {int} offstate - Value representing "off" state (e.g., 0 or false)
 * @param {Object} [options] - Additional options
 */
export function setupBooleanToggle(element, settings, key, configPath, {
    onMessage = "Reboot to take effect",
    offMessage = "Reboot to take effect",
    onAction = null,
    offAction = null,
    onstate = 1,
    offstate = 0,
} = {}) {
    element.addEventListener("click", async function () {
        if (settings[key] >= onstate) {
            await run(`sed -i 's/${key}=.*/${key}=${offstate}/' ${configPath}`);
            settings[key] = offstate;
            if (offAction) await offAction();
            toast(offMessage);
        } else {
            await run(`sed -i 's/${key}=.*/${key}=${onstate}/' ${configPath}`);
            settings[key] = onstate;
            if (onAction) await onAction();
            toast(onMessage);
        }
    });
}

/**
 * Escape HTML special characters for safe interpolation into markup
 * @param {string} text - Raw text
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
