/**
 * Translation system for SUS-FS WebUI
 * Uses XML files to store translations for different languages
 */

// Available languages - add more as needed
const availableLanguages = {
  'en': 'English',
  'es': 'Español',
  'fr': 'Français',
};

// Current language
let currentLanguage = localStorage.getItem('susfs_language') || 'en';

/**
 * Load a language XML file
 * @param {string} langCode - The language code to load (e.g., 'en', 'id')
 * @returns {Promise<Document>} - XML document with translations
 */
async function loadLanguage(langCode) {
  try {
    const response = await fetch(`/languages/${langCode}.xml`);
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    return xmlDoc;
  } catch (error) {
    console.error(`Failed to load language ${langCode}:`, error);
    // Fallback to English if requested language fails
    if (langCode !== 'en') {
      //toast(`Failed to load ${availableLanguages[langCode]}, falling back to English`);
      return loadLanguage('en');
    }
    return null;
  }
}

/**
 * Apply translations from XML to the DOM
 * @param {Document} xmlDoc - XML document with translations
 */
function applyTranslations(xmlDoc) {
  if (!xmlDoc) return;
  
  const strings = xmlDoc.getElementsByTagName("string");
  for (let i = 0; i < strings.length; i++) {
    const id = strings[i].getAttribute("id");
    const text = strings[i].textContent;
    
    // Apply to elements with matching data-i18n attribute
    const elements = document.querySelectorAll(`[data-i18n="${id}"]`);
    elements.forEach(el => {
      el.textContent = text;
    });
  }
}

/**
 * Switch the UI language
 * @param {string} langCode - The language code to switch to
 */
async function switchLanguage(langCode) {
  if (!availableLanguages[langCode]) {
    console.error(`Language ${langCode} not supported`);
    return;
  }
  
  const xmlDoc = await loadLanguage(langCode);
  if (xmlDoc) {
    applyTranslations(xmlDoc);
    localStorage.setItem('susfs_language', langCode);
    currentLanguage = langCode;
    
    // Update language selector if it exists
    const langSelect = document.getElementById('language');
    if (langSelect) {
      langSelect.value = langCode;
    }
    
    // Notify of language change
    //toast(`Language changed to ${availableLanguages[langCode]}`);
  }
}

/**
 * Initialize the translation system
 */
async function initTranslations() {
  // Create language selector
  createLanguageSelector();
  
  // Load saved language or default
  await switchLanguage(currentLanguage);
}

async function languageSelect(){
    const select = document.getElementById('language');
    await switchLanguage(currentLanguage);
    select.addEventListener('change', (event) => {
        switchLanguage(event.target.value);
    });
}

/**
 * Create the language selector dropdown
 */
function createLanguageSelector() {
  const select = document.getElementById('language');
  
  for (const [code, name] of Object.entries(availableLanguages)) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = name;
    option.className= 'text-black dark:text-white dark:bg-black';
    if (code === currentLanguage) {
      option.selected = true;
    }
    select.appendChild(option);
  }
  
  select.addEventListener('change', (event) => {
    switchLanguage(event.target.value);
  });
}

/**
 * Apply translations to new content after page transition
 * @param {HTMLElement} view - The new view from Highway.js
 */
async function applyTranslationsToNewContent(view) {
    // Load the current language XML
    const langDoc = await loadLanguage(currentLanguage);
    
    if (!langDoc) return;
    
    const strings = langDoc.getElementsByTagName("string");
    
    // Apply translations to elements in the new view
    for (let i = 0; i < strings.length; i++) {
      const id = strings[i].getAttribute("id");
      const text = strings[i].textContent;
      
      // Apply to elements with matching data-i18n attribute
      const elements = view.querySelectorAll(`[data-i18n="${id}"]`);
      elements.forEach(el => {
        el.textContent = text;
      });
    }
    
    // Recreate language selector if it doesn't exist in the new page
    if (!view.querySelector('#language')) {
      createLanguageSelector();
    }
    // Reinitialize the language selector
    languageSelect();
}
  
// Export functions
window.i18n = {
    init: initTranslations,
    switchLanguage: switchLanguage,
    getCurrentLanguage: () => currentLanguage,
    applyTranslationsToNewContent: applyTranslationsToNewContent
};