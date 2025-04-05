import {
    name2,
    eventSource,
    event_types,
    isStreamingEnabled,
    saveSettingsDebounced,
} from '../../../../script.js';


import {
  getSortedEntries,
} from '../../../world-info.js';

import { extension_settings } from '../../../extensions.js';
import { selected_group } from '../../../group-chats.js';
import { t } from '../../../i18n.js';

const MODULE = 'Lore_Tips';
const legacyIndicatorTemplate = document.getElementById('typing_indicator_template');
const userinputField = document.getElementById(`send_textarea`);

/**
 * @typedef {Object} TypingIndicatorSettings
 * @property {boolean} enabled
 * @property {boolean} streaming
 */

/**
 * @type {TypingIndicatorSettings}
 */
const defaultSettings = {
    enabled: false,
    delay : 200, // How often we attempt to check for matches
    regexInterval: 1000, // How often we attempt to check for Regex
    defaultOpacity: 0.4, // Default opacity of the LoreTip display
    tooltipPosition: "above", // "above" or "top" - Tooltip position
    debugMode: false, // Enable debug logging
    textColorOverride: "", // Text color override
    backgroundColorOverride: "", // Background color override
    viewkey: 69,
    cycleUp: 38,
    cycleDown: 40,
    SelectLT: 9,
    rowstoshow:2,
    ignoredRegex: "", // New setting for ignored regex
};

/**
 * Get the settings for this extension.
 * If the settings are not found, the default settings are initialized.
 * @returns {TypingIndicatorSettings} Settings object
 */
function getSettings() {
    if (extension_settings[MODULE] === undefined) {
        extension_settings[MODULE] = structuredClone(defaultSettings);
    }

    for (const key in defaultSettings) {
        if (extension_settings[MODULE][key] === undefined) {
            extension_settings[MODULE][key] = defaultSettings[key];
        }
    }

    return extension_settings[MODULE];
}


/**
 * Draws the settings for this extension.
 * @param {TypingIndicatorSettings} settings Settings object
 * @returns {void}
 */
function addExtensionSettings(settings) {
    const settingsContainer = document.getElementById('loretips_container') ?? document.getElementById('extensions_settings');
    if (!settingsContainer) {
        return;
    }


    const inlineDrawer = document.createElement('div');
    inlineDrawer.classList.add('inline-drawer');
    settingsContainer.append(inlineDrawer);

    const inlineDrawerToggle = document.createElement('div');
    inlineDrawerToggle.classList.add('inline-drawer-toggle', 'inline-drawer-header');

    const extensionName = document.createElement('b');
    extensionName.textContent = t`Lore Tips`;

    const inlineDrawerIcon = document.createElement('div');
    inlineDrawerIcon.classList.add('inline-drawer-icon', 'fa-solid', 'fa-circle-chevron-down', 'down');

    inlineDrawerToggle.append(extensionName, inlineDrawerIcon);

    let inlineDrawerContent = document.createElement('div');
    inlineDrawerContent.classList.add('inline-drawer-content');
    inlineDrawerContent.style.flexDirection = 'column'; // Stack settings vertically

    inlineDrawer.append(inlineDrawerToggle, inlineDrawerContent);

    // Enabled
    const enabledCheckboxLabel = document.createElement('label');
    enabledCheckboxLabel.classList.add('checkbox_label');
    enabledCheckboxLabel.htmlFor = 'lootTipEnabled';
    const enabledCheckbox = document.createElement('input');
    enabledCheckbox.id = 'lootTipEnabled';
    enabledCheckbox.type = 'checkbox';
    enabledCheckbox.checked = settings.enabled;
    enabledCheckbox.classList.add('text_pole'); // Added class
    enabledCheckbox.addEventListener('change', () => {
        settings.enabled = enabledCheckbox.checked;
        saveSettingsDebounced();
        ReBuildLore();
    });
    const enabledCheckboxText = document.createElement('span');
    enabledCheckboxText.textContent = t`Enabled`;
    enabledCheckboxLabel.append(enabledCheckbox, enabledCheckboxText);
    inlineDrawerContent.append(enabledCheckboxLabel);

    // Debug Mode
    const debugModeCheckboxLabel = document.createElement('label');
    debugModeCheckboxLabel.classList.add('checkbox_label');
    debugModeCheckboxLabel.htmlFor = 'loreTipsDebugMode';
    const debugModeCheckbox = document.createElement('input');
    debugModeCheckbox.id = 'loreTipsDebugMode';
    debugModeCheckbox.type = 'checkbox';
    debugModeCheckbox.checked = settings.debugMode;
    debugModeCheckbox.classList.add('text_pole'); // Added class
    debugModeCheckbox.addEventListener('change', () => {
        settings.debugMode = debugModeCheckbox.checked;
        saveSettingsDebounced();
    });
    const debugModeCheckboxText = document.createElement('span');
    debugModeCheckboxText.textContent = t`Debug Mode`;
    debugModeCheckboxLabel.append(debugModeCheckbox, debugModeCheckboxText);
    inlineDrawerContent.append(debugModeCheckboxLabel);


    // Check Delay
    const checkDelayLabel = document.createElement('label');
    checkDelayLabel.classList.add('labeled_input');
    const checkDelaySpan = document.createElement('span');
    checkDelaySpan.textContent = t`Check Delay (ms):`;
    const checkDelayInput = document.createElement('input');
    checkDelayInput.type = 'number';
    checkDelayInput.min = 100;
    checkDelayInput.value = settings.delay;
    checkDelayInput.classList.add('text_pole'); // Added class
    checkDelayInput.addEventListener('change', () => {
        settings.delay = parseInt(checkDelayInput.value, 10);
        if (settings.delay < 100) settings.delay = 100;
        saveSettingsDebounced();
    });
    checkDelayLabel.append(checkDelaySpan, checkDelayInput);
    inlineDrawerContent.append(checkDelayLabel);

    // Regex Interval
    const regexIntervalLabel = document.createElement('label');
    regexIntervalLabel.classList.add('labeled_input');
    const regexIntervalSpan = document.createElement('span');
    regexIntervalSpan.textContent = t`Regex Interval (ms):`;
    const regexIntervalInput = document.createElement('input');
    regexIntervalInput.type = 'number';
    regexIntervalInput.min = 100;
    regexIntervalInput.value = settings.regexInterval;
    regexIntervalInput.classList.add('text_pole'); // Added class
    regexIntervalInput.addEventListener('change', () => {
        settings.regexInterval = parseInt(regexIntervalInput.value, 10);
        if (settings.regexInterval < 100) settings.regexInterval = 100;
        saveSettingsDebounced();
    });
    regexIntervalLabel.append(regexIntervalSpan, regexIntervalInput);
    inlineDrawerContent.append(regexIntervalLabel);

    // Default Opacity
    const defaultOpacityLabel = document.createElement('label');
    defaultOpacityLabel.classList.add('labeled_input');
    const defaultOpacitySpan = document.createElement('span');
    defaultOpacitySpan.textContent = t`Default Opacity:`;
    const defaultOpacityInput = document.createElement('input');
    defaultOpacityInput.type = 'number';
    defaultOpacityInput.min = 0;
    defaultOpacityInput.max = 1;
    defaultOpacityInput.step = 0.05;
    defaultOpacityInput.value = settings.defaultOpacity;
    defaultOpacityInput.classList.add('text_pole'); // Added class
    defaultOpacityInput.addEventListener('change', () => {
        settings.defaultOpacity = parseFloat(defaultOpacityInput.value);
        if (settings.defaultOpacity < 0) settings.defaultOpacity = 0;
        if (settings.defaultOpacity > 1) settings.defaultOpacity = 1;
        saveSettingsDebounced();
        UpdateLoreTipStyle(); // Update style directly without rebuild
    });
    defaultOpacityLabel.append(defaultOpacitySpan, defaultOpacityInput);
    inlineDrawerContent.append(defaultOpacityLabel);

    // Tooltip Position
    const tooltipPositionLabel = document.createElement('label');
    tooltipPositionLabel.classList.add('labeled_input');
    const tooltipPositionSpan = document.createElement('span');
    tooltipPositionSpan.textContent = t`Tooltip Position:`;
    const tooltipPositionSelect = document.createElement('select');
    tooltipPositionSelect.innerHTML = `
        <option value="above">Above Textarea</option>
        <option value="top">Top of Screen</option>
    `;
    tooltipPositionSelect.value = settings.tooltipPosition;
    tooltipPositionSelect.classList.add('text_pole'); // Added class
    tooltipPositionSelect.addEventListener('change', () => {
        settings.tooltipPosition = tooltipPositionSelect.value;
        saveSettingsDebounced();
        positionLoreTips(); // Reposition tooltip
    });
    tooltipPositionLabel.append(tooltipPositionSpan, tooltipPositionSelect);
    inlineDrawerContent.append(tooltipPositionLabel);

    // Text Color Override
    const textColorOverrideLabel = document.createElement('label');
    textColorOverrideLabel.classList.add('labeled_input');
    const textColorOverrideSpan = document.createElement('span');
    textColorOverrideSpan.textContent = t`Text Color Override:`;
    const textColorOverrideInput = document.createElement('input');
    textColorOverrideInput.type = 'color';
    textColorOverrideInput.value = settings.textColorOverride;
    textColorOverrideInput.classList.add('text_pole'); // Added class
    textColorOverrideInput.addEventListener('change', () => {
        settings.textColorOverride = textColorOverrideInput.value;
        saveSettingsDebounced();
        UpdateLoreTipStyle();
    });
    textColorOverrideLabel.append(textColorOverrideSpan, textColorOverrideInput);
    inlineDrawerContent.append(textColorOverrideLabel);

    // Background Color Override
    const backgroundColorOverrideLabel = document.createElement('label');
    backgroundColorOverrideLabel.classList.add('labeled_input');
    const backgroundColorOverrideSpan = document.createElement('span');
    backgroundColorOverrideSpan.textContent = t`Background Color Override:`;
    const backgroundColorOverrideInput = document.createElement('input');
    backgroundColorOverrideInput.type = 'color';
    backgroundColorOverrideInput.value = settings.backgroundColorOverride;
    backgroundColorOverrideInput.classList.add('text_pole'); // Added class
    backgroundColorOverrideInput.addEventListener('change', () => {
        settings.backgroundColorOverride = backgroundColorOverrideInput.value;
        saveSettingsDebounced();
        UpdateLoreTipStyle();
    });
    backgroundColorOverrideLabel.append(backgroundColorOverrideSpan, backgroundColorOverrideInput);
    inlineDrawerContent.append(backgroundColorOverrideLabel);

      // **New: Ignored Regex Setting**
    const ignoredRegexLabel = document.createElement('label');
    ignoredRegexLabel.classList.add('labeled_input');
    const ignoredRegexSpan = document.createElement('span');
    ignoredRegexSpan.textContent = t`Ignored Regex (comma-separated):`; // Instruction for delimiter
    const ignoredRegexInput = document.createElement('input');
    ignoredRegexInput.type = 'text';
    ignoredRegexInput.value = settings.ignoredRegex;
    ignoredRegexInput.classList.add('text_pole');
    ignoredRegexInput.addEventListener('change', () => {
        settings.ignoredRegex = ignoredRegexInput.value;
        saveSettingsDebounced();
        PreProcessLore(); // Re-preprocess lore when ignored regex changes
    });
    ignoredRegexLabel.append(ignoredRegexSpan, ignoredRegexInput);
    inlineDrawerContent.append(ignoredRegexLabel);

 // **New: Rows to Show Setting**
    const rowsToShowLabel = document.createElement('label');
    rowsToShowLabel.classList.add('labeled_input');
    const rowsToShowSpan = document.createElement('span');
    rowsToShowSpan.textContent = t`Rows to Show (Max):`;
    const rowsToShowInput = document.createElement('input');
    rowsToShowInput.type = 'number';
    rowsToShowInput.min = 1;
    rowsToShowInput.max = 10; // Or a reasonable max value
    rowsToShowInput.value = settings.rowstoshow;
    rowsToShowInput.classList.add('text_pole');
    rowsToShowInput.addEventListener('change', () => {
        settings.rowstoshow = parseInt(rowsToShowInput.value, 10);
        if (settings.rowstoshow < 1) settings.rowstoshow = 1; // Ensure min value
        if (settings.rowstoshow > 10) settings.rowstoshow = 10; // Ensure max value (optional)
        saveSettingsDebounced();
        UpdateLoreTipStyle(); // Update style directly
        positionLoreTips(); // Reposition if needed due to height change
    });
    rowsToShowLabel.append(rowsToShowSpan, rowsToShowInput);
    inlineDrawerContent.append(rowsToShowLabel);
    
    // Reset to Defaults Button
    const resetDefaultsButton = document.createElement('input');
    resetDefaultsButton.type = 'button';
    resetDefaultsButton.value = t`Reset to Defaults`;
    resetDefaultsButton.classList.add('text_pole'); // Added class
    resetDefaultsButton.addEventListener('click', () => {
        extension_settings[MODULE] = structuredClone(defaultSettings); // Reset settings
        saveSettingsDebounced();
        addExtensionSettings(getSettings()); // Re-draw settings UI
        ReBuildLore(); // Rebuild LoreTips UI
    });
    inlineDrawerContent.append(resetDefaultsButton);


}


async function LoreTipGetLatest() {
    CachedLore = await getSortedEntries();
    PreProcessLore(); // Preprocess lore data after fetching latest
    return;
}

var CachedLore = []
let stringLoreData = [];
let regexLoreData = [];
let ignoredKeys = []; // Renamed to ignoredKeys - now stores literal strings

function PreProcessLore() {
    const settings = getSettings();
    stringLoreData = [];
    regexLoreData = [];
    ignoredKeys = []; // Clear ignoredKeys

    // Process ignored keys - simply split and store as strings
    if (settings.ignoredRegex) {
        ignoredKeys = settings.ignoredRegex.split(',').map(s => s.trim()); // Split and trim, store as strings
        if (settings.debugMode) console.log("LoreTips: PreProcessLore - Ignored Keys:", ignoredKeys);
    }


    CachedLore.forEach(entry => {
        const stringKeys = [];
        const regexKeys = [];

        entry.key.forEach(key => {
            let isIgnoredKey = false; // Renamed flag for clarity

            // **Direct Literal String Key Ignore Check:**
            if (ignoredKeys.includes(key)) { // Check for literal key match
                isIgnoredKey = true;
                if (settings.debugMode) console.log(`LoreTips: PreProcessLore - Key "${key}" ignored because it is in ignoredKeys list.`);
            }

            if (!isIgnoredKey) { // Process key only if NOT ignored
                if (typeof key === 'string' && key.startsWith('/') && key.lastIndexOf('/') > 0) {
                    const lastSlashIndex = key.lastIndexOf('/');
                    const regexPatternString = key.slice(1, lastSlashIndex);
                    const flags = key.slice(lastSlashIndex + 1);

                    if (settings.debugMode) {
                        console.log(`LoreTips: PreProcessLore - Potential Regex Key Found: ${key}`);
                        console.log(`LoreTips: PreProcessLore - Extracted Regex Pattern: ${regexPatternString}`);
                        console.log(`LoreTips: PreProcessLore - Extracted Regex Flags: ${flags}`);
                    }

                    try {
                        const regex = new RegExp(regexPatternString, flags);
                        regexKeys.push(regex);
                        if (settings.debugMode) console.log(`LoreTips: PreProcessLore -  Regex Pattern Compiled Successfully: ${key} with flags "${flags}"`);
                    } catch (e) {
                        console.warn(`LoreTips: Invalid regex pattern: ${key} in entry: ${entry.comment}. Treating as string.`);
                        if (settings.debugMode) {
                            console.log(`LoreTips: PreProcessLore - RegExp Error for key: ${key}`, e);
                        }
                        stringKeys.push(key);
                        if (settings.debugMode) console.log(`LoreTips: PreProcessLore - Invalid Regex Pattern, treating as String: ${key} `);
                    }
                } else if (typeof key === 'string') {
                    stringKeys.push(key);
                    if (settings.debugMode) console.log(`LoreTips: PreProcessLore - String Key Added: ${key} `);
                } else {
                    console.warn(`LoreTips: Non-string key encountered in entry: ${entry.comment}. Ignoring key:`, key);
                    if (settings.debugMode) console.log(`LoreTips: PreProcessLore - Non-String Key Ignored: ${key} `);
                }
            }
        });

        if (regexKeys.length > 0) {
            regexLoreData.push({...entry, key: regexKeys});
        }
        if (stringKeys.length > 0) {
            stringLoreData.push({...entry, key: stringKeys});
        }
    });
    if (settings.debugMode) {
        console.log("LoreTips: String Lore Data Generated", stringLoreData);
        console.log("LoreTips: Regex Lore Data Generated", regexLoreData);
    }
}

function GenerateLoreTip() {

    const settings = getSettings();


   // --- Create HTML Elements Dynamically ---
    const style = document.createElement('style');
    style.id = "LoretipCss";
    style.textContent = `
        #LoreTips {
            display: none;
            position: absolute;
            border: 1px solid #ccc;
            background-color: ${settings.backgroundColorOverride || 'var(--SmartThemeBlurTintColor)'};
            max-height: ${settings.rowstoshow * 50}px; /* Adjusted row height to 30px */
            overflow-y: auto;
            max-width:1200px;
            z-index: 200;
            opacity:${settings.defaultOpacity};
        }

        #LoreTips:hover {
            opacity:1;

        }
        #LoreTips table {
            width: 100%;
            border-collapse: collapse; /* Optional: For cleaner table borders */
        }
        #LoreTips td {
            border: 0px solid;
            max-height:30px;
            padding: calc(var(--mainFontSize)* 1);
            text-align: left;
            word-break: break-word; /* Ensure long words wrap */
            overflow: hidden; /* Prevent content overflow */
            text-overflow: ellipsis; /* Indicate overflow with ellipsis */
            white-space: nowrap; /* Prevent line breaks in cells */
            color: ${settings.textColorOverride || 'var(--SmartThemeBodyColor)'};
            text-shadow: 0px 0px calc(var(--shadowWidth)* 1px) var(--SmartThemeChatTintColor) !important;
        }

        #LoreTips td:nth-child(1)  {
            max-width: 200px;
        }
        #LoreTips td:nth-child(2)  {
            max-width: 400px;
        }

        #LoreTips.ctrl-pressed {
        opacity: 1;
        }


        #loreTipsTableBody tr:hover {
            background-color: color-mix(in srgb, var(--SmartThemeBlurTintColor) 95%, var(--SmartThemeBorderColor) 5%); /* Highlight on hover */
        }
        #loreTipsTableBody tr.highlighted {
            background-color: color-mix(in srgb, var(--SmartThemeBlurTintColor) 95%, var(--SmartThemeBorderColor) 5%); /* Highlighted row */
        }
        .regex-match { /* Style for regex match rows, can customize */
            font-style: italic;
            color: darkgray;
        }
    `;
    document.head.appendChild(style);


    const loreTipsDiv = document.createElement('div');
    loreTipsDiv.id = 'LoreTips';

    const loreTipsTable = document.createElement('table');
    loreTipsTable.id = "loretableslub"
    loreTipsDiv.appendChild(loreTipsTable);


    const tableHead = document.createElement('thead');
    loreTipsTable.appendChild(tableHead);

    const headerRow = document.createElement('tr');
    tableHead.appendChild(headerRow);

    const loreTipsTableBody = document.createElement('tbody');
    loreTipsTableBody.id = 'loreTipsTableBody';
    loreTipsTable.appendChild(loreTipsTableBody);

    document.body.appendChild(loreTipsDiv);


}

function UpdateLoreTipStyle() {
     const settings = getSettings();
     const styleElement = document.getElementById('LoretipCss');
     if (!styleElement) return;

        styleElement.textContent = `
        #LoreTips {
            display: none;
            position: absolute;
            border: 1px solid #ccc;
            background-color: ${settings.backgroundColorOverride || 'var(--SmartThemeBlurTintColor)'};
            max-height: ${settings.rowstoshow * 50}px; /* **Corrected to 50px row height** */
            overflow-y: auto;
            max-width:1200px;
            z-index: 200;
            opacity:${settings.defaultOpacity};
        }

        #LoreTips:hover {
            opacity:1;

        }
        #LoreTips table {
            width: 100%;
            border-collapse: collapse; /* Optional: For cleaner table borders */
        }
        #LoreTips td {
            border: 0px solid;
            max-height:50px; /* **Corrected to 50px row height** */
            padding: calc(var(--mainFontSize)* 1);
            text-align: left;
            word-break: break-word; /* Ensure long words wrap */
            overflow: hidden; /* Prevent content overflow */
            text-overflow: ellipsis; /* Indicate overflow with ellipsis */
            white-space: nowrap; /* Prevent line breaks in cells */
            color: ${settings.textColorOverride || 'var(--SmartThemeBodyColor)'};
            text-shadow: 0px 0px calc(var(--shadowWidth)* 1px) var(--SmartThemeChatTintColor) !important;
        }

        #LoreTips td:nth-child(1)  {
            max-width: 200px;
        }
        #LoreTips td:nth-child(2)  {
            max-width: 400px;
        }

        #LoreTips.ctrl-pressed {
        opacity: 1;
        }


        #loreTipsTableBody tr:hover {
            background-color: color-mix(in srgb, var(--SmartThemeBlurTintColor) 95%, var(--SmartThemeBorderColor) 5%); /* Highlight on hover */
        }
        #loreTipsTableBody tr.highlighted {
            background-color: color-mix(in srgb, var(--SmartThemeBlurTintColor) 95%, var(--SmartThemeBorderColor) 5%); /* Highlighted row */
        }
        .regex-match { /* Style for regex match rows, can customize */
            font-style: italic;
            color: darkgray;
        }
    `;
}

function AttachLoreMonitor() {

    const UserChatBox = document.getElementById('send_textarea');
    const loreTipsDiv = document.getElementById('LoreTips');
    const loreTipsTableBody = document.getElementById('loreTipsTableBody');

    // Your data array (provided in the prompt) - now using preprocessed data
    const loreData = CachedLore;
    const settings = getSettings();


    let timeoutId;
    let currentInputString = ''; // Renamed from currentWord
    let lastInputValue = '';
    let highlightedRowIndex = 0;
    let visibleMatches = [];
    let potentialMatchesMemory = [];
    let activeRegexMatches = []; // Store currently active regex matches
    let regexCheckTimeout; // Timer for regex checks
    const regexCheckInterval = settings.regexInterval; // Check regex every 1 second (adjust as needed)


    // Function to get the current input string since last space (No changes)
    function getCurrentInputString() {
        const inputValue = UserChatBox.value;
        const cursorPosition = UserChatBox.selectionStart;
        let stringStart = 0;
        for (let i = cursorPosition - 1; i >= 0; i--) {
            if (/\s/.test(inputValue[i])) {
                stringStart = i + 1;
                break;
            }
        }
        return inputValue.substring(stringStart, cursorPosition);
    }


    // Function to search for STRING triggers (Optimized for strings only)
    function searchStringTriggers(inputString) {
        if (!inputString) return [];
        const lowerInput = inputString.toLowerCase();
        return stringLoreData.reduce((matches, entry) => { // Use stringLoreData here
            if(entry.disable) return matches;
            for (const key of entry.key) { // entry.key is now always string[]
                const lowerKey = key.toLowerCase();
                if (lowerKey.includes(lowerInput)) {
                     if (settings.debugMode) console.log(`LoreTips: String Match found for "${inputString}" in key "${key}"`); //Debug Log
                    matches.push({ comment: entry.comment, triggers: entry.key, content: entry.content, entry: entry, isRegex: false }); // isRegex flag
                    return matches;
                }
            }
            return matches;
        }, []);
    }


    // Function to search for REGEX triggers (Separate slower check)
    function searchRegexTriggers(fullInput) { // Now takes the full input string
        if (settings.debugMode) console.log("LoreTips: searchRegexTriggers CALLED"); // **DEBUG LOG - Is this function being called?**
        if (!fullInput) return [];
        return regexLoreData.reduce((matches, entry) => { // Use regexLoreData here
            if(entry.disable) return matches;
            for (const key of entry.key) { // entry.key is now always RegExp[]
                if (key instanceof RegExp) { // Explicitly check for RegExp object
                     if (settings.debugMode) console.log(`LoreTips: Testing Regex: ${key.toString()} against "${fullInput}"`); //Debug Log
                    if (key.test(fullInput)) {
                         if (settings.debugMode) console.log(`LoreTips: Regex Match Found: ${key.toString()} for "${fullInput}"`); //Debug Log
                        matches.push({ comment: entry.comment, triggers: entry.key.map(r => r.toString()), content: entry.content, entry: entry, isRegex: true }); // isRegex flag, store regex as string for display
                        return matches;
                    } else  if (settings.debugMode) console.log(`LoreTips: Regex No Match: ${key.toString()} for "${fullInput}"`); //Debug Log
                }
            }
            return matches;
        }, []);
    }


    // Function to filter potential matches from memory (No changes needed, but good to review regex part)
    function filterPotentialMatches(inputString, memory) {
        if (!inputString || memory.length === 0) return [];
        const lowerInput = inputString.toLowerCase();
        return memory.filter(memoEntry => {
            for (const key of memoEntry.entry.key) {
                if (typeof key === 'string') { // Still need to handle string keys in memory
                    const lowerKey = key.toLowerCase();
                    if (lowerKey.startsWith(lowerInput)) {
                        return true;
                    }
                } else if (key instanceof RegExp) { // Keep regex mem entries for now
                    if (key.test(inputString)) {
                        return true;
                    }
                }
            }
            return false;
        });
    }


    // Function to display tooltips (Modified to handle regex matches) (No changes needed)
    function displayTooltips(stringMatches, regexMatches) { // Takes both types of matches
    visibleMatches = [...stringMatches, ...regexMatches]; // Combine both match types
    loreTipsTableBody.innerHTML = '';
    highlightedRowIndex = 0;

    if (visibleMatches.length > 0) {
        loreTipsDiv.style.display = 'block';

        visibleMatches.forEach((match, index) => {
            const row = loreTipsTableBody.insertRow();
            if(match.truematch) row.style.backgroundColor = "var(--tertiaryBg)"; // Existing style
            if(!match.truematch) row.style.opacity = 0.5; // Existing style
            const commentCell = row.insertCell(0);
            const triggersCell = row.insertCell(1);
            const contentCell = row.insertCell(2);

            commentCell.textContent = match.comment;
            triggersCell.textContent = match.triggers.join(', '); // Triggers are already stringified regex patterns if regex
            contentCell.textContent = match.content;

            if (match.isRegex) { // Apply style for regex matches
                row.classList.add('regex-match');
            }

            if (index === highlightedRowIndex) {
                row.classList.add('highlighted');
            }
        });

        // **Call positionLoreTips AFTER displaying tooltips to adjust for height**
        positionLoreTips(); // Reposition tooltip after content is updated

    } else {
        hideTooltips();
    }
}


    // Function to hide and clear tooltips (No changes)
    function hideTooltips() {
        loreTipsDiv.style.display = 'none';
        loreTipsTableBody.innerHTML = '';
        visibleMatches = [];
        highlightedRowIndex = 0;
    }


      // Function to handle input with debounce (Modified for Regex Check)
    function handleInput() {
      

        const settings = getSettings(); // Get settings at the start of handleInput
         if (settings.debugMode) console.log("LoreTips: handleInput FUNCTION CALLED"); // **NEW DEBUG LOG - Is handleInput being called at all?**
        
        clearTimeout(timeoutId);
        clearTimeout(regexCheckTimeout); // Clear any pending regex check

        timeoutId = setTimeout(() => {
            const currentInputValue = getCurrentInputString();
            if (currentInputValue !== currentInputString || UserChatBox.value !== lastInputValue) {
                currentInputString = currentInputValue;
                lastInputValue = UserChatBox.value;

                let stringMatches = [];
                if (potentialMatchesMemory.length > 0) {
                    potentialMatchesMemory = filterPotentialMatches(currentInputString, potentialMatchesMemory);
                    stringMatches = potentialMatchesMemory;
                } else {
                    stringMatches = searchStringTriggers(currentInputString);
                    potentialMatchesMemory = stringMatches;
                }

                // No immediate regex search here - regex is checked on interval now
                displayTooltips(stringMatches, activeRegexMatches); // Display string and active regex matches
                resetHighlight();

                if (stringMatches.length === 0) {
                    potentialMatchesMemory = [];
                }
            }
        }, settings.delay); // Use delay from settings


        // Schedule a regex check after the input delay (or after a short interval)
        clearTimeout(regexCheckTimeout); // Clear previous timeout to avoid overlaps
        if (settings.debugMode) console.log("LoreTips: handleInput - Setting up regexCheckTimeout");
        regexCheckTimeout = setTimeout(() => {
            if (settings.debugMode) console.log("LoreTips: regexCheckTimeout FIRING - About to call searchRegexTriggers");
            const currentFullInput = UserChatBox.value;
            const newRegexMatches = searchRegexTriggers(currentFullInput);

            // Basic logic: Replace activeRegexMatches with new matches on each interval
            activeRegexMatches = newRegexMatches;

             // Re-display tooltips to update regex matches
            const currentStringMatches = potentialMatchesMemory; // Get current string matches
            displayTooltips(currentStringMatches, activeRegexMatches);
            resetHighlight();

        }, regexCheckInterval); // Delay for regex check
    }

    // Function to reset highlight to the top row if list changes (No changes)
    function resetHighlight() {
        const highlightedRow = loreTipsTableBody.querySelector('tr.highlighted');
        if (highlightedRow) {
            highlightedRow.classList.remove('highlighted');
        }
        highlightedRowIndex = 0;
        if (loreTipsTableBody.rows.length > 0) {
            loreTipsTableBody.rows[highlightedRowIndex].classList.add('highlighted');
        }
    }


    function navigateTooltips(direction) {
        if (visibleMatches.length === 0) return;

        const rows = loreTipsTableBody.rows;
        if (rows.length === 0) return;

        rows[highlightedRowIndex].classList.remove('highlighted'); // Remove current highlight
        highlightedRowIndex += direction;


        if (highlightedRowIndex < 0) {
            highlightedRowIndex = rows.length - 1; // Wrap to bottom
        } else if (highlightedRowIndex >= rows.length) {
            highlightedRowIndex = 0; // Wrap to top
        }

        rows[highlightedRowIndex].classList.add('highlighted'); // Add new highlight

        // Scroll into view if needed (optional, but good UX)
        rows[highlightedRowIndex].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'start'
        });
    }


    // --- Cursor position change or re-focus logic --- (No changes)
    UserChatBox.addEventListener('mouseup', handleCursorMove); // Mouse click to move cursor
    UserChatBox.addEventListener('keyup', handleCursorMove);   // Arrow keys to move cursor
    UserChatBox.addEventListener('input', handleInput);

    function handleCursorMove() {
        if (UserChatBox === document.activeElement) { // Only if textarea is focused
            const currentInputValue = getCurrentInputString();
            if (currentInputValue) {
                if (currentInputValue !== currentInputString) {
                    currentInputString = currentInputValue;

                    let stringMatches = [];
                    if (potentialMatchesMemory.length > 0) {
                        potentialMatchesMemory = filterPotentialMatches(currentInputString, potentialMatchesMemory);
                        stringMatches = potentialMatchesMemory;
                    } else {
                        stringMatches = searchStringTriggers(currentInputString);
                        potentialMatchesMemory = stringMatches;
                    }
                     displayTooltips(stringMatches, activeRegexMatches); // Display string and active regex matches
                    resetHighlight();
                    if (stringMatches.length === 0) {
                        potentialMatchesMemory = [];
                    }
                }
            } else {
                hideTooltips(); // Hide if no word under cursor
                currentInputString = '';
                potentialMatchesMemory = [];
                activeRegexMatches = []; // Clear regex matches on no word under cursor
            }
        }
    }

function positionLoreTips() {
    const textarea = document.getElementById('form_sheld');
    const loreTipsDiv = document.getElementById('LoreTips');

    if (!textarea || !loreTipsDiv) {
        return; // Exit if elements not found
    }

    const settings = getSettings();
    const textareaRect = textarea.getBoundingClientRect();


    let topOffset = 0;
    if (settings.tooltipPosition === "above") {
        // **Corrected "above" position calculation**
        const loreTipsHeight = loreTipsDiv.offsetHeight; // Get actual rendered height
        topOffset = loreTipsHeight + 10; // Add margin
        loreTipsDiv.style.top = (textareaRect.top + window.scrollY - topOffset ) + 'px';
    } else if (settings.tooltipPosition === "top") {
         loreTipsDiv.style.top = 10+ 'px';
    }


    // Position LoreTips  based on settings
   
    loreTipsDiv.style.left = textareaRect.left + 16 + 'px';


    // Ensure LoreTips width matches textarea width (already handled, but good to keep in mind)
    loreTipsDiv.style.width = textarea.offsetWidth - 32 + 'px';
    loreTipsDiv.style.maxWidth = textarea.offsetWidth - 32 + 'px';


    // Set z-index for LoreTips to be higher than textarea
    const textareaZIndex = window.getComputedStyle(textarea).zIndex;
    let loreTipsZIndexValue = 1; // Default z-index for LoreTips

    if (textareaZIndex && textareaZIndex !== 'auto') {
        loreTipsZIndexValue = parseInt(textareaZIndex, 10) + 1;
    } else {
        loreTipsZIndexValue = 2; // If textarea has no z-index, set LoreTips to 2 (assuming textarea is default 0 or 1)
    }
    loreTipsDiv.style.zIndex = loreTipsZIndexValue.toString();

}

// Call positionLoreTips initially and on window resize (and potentially on scroll if layout is affected)
positionLoreTips();
window.addEventListener('resize', positionLoreTips);


}

async function ReBuildLore() {

if(document.getElementById("LoreTips") != undefined) { //we already have the loretip

    document.getElementById("LoreTips").remove();
    document.getElementById("LoretipCss").remove();
    //console.log("Slub: Refreshed CSS/LoreTip");
}

    const settings = getSettings();

    if(settings.enabled) {
        GenerateLoreTip();
        AttachLoreMonitor();
    }
}


(async function () {
    const settings = getSettings();
    addExtensionSettings(settings);
    await LoreTipGetLatest();
    await ReBuildLore();


       // **Create Lore Tips Toggle in Extensions Menu**
     const extensionsMenu = document.getElementById('extensionsMenu');
    if (extensionsMenu) {
        const loreTipsToggleContainer = document.createElement('div');
        loreTipsToggleContainer.classList.add('extension_container', 'interactable');
        loreTipsToggleContainer.id = 'loretips_toggle_container';
        loreTipsToggleContainer.tabIndex = 0;

        const loreTipsToggleButton = document.createElement('div');
        loreTipsToggleButton.id = 'toggleLoreTipsButton';
        loreTipsToggleButton.classList.add('list-group-item', 'flex-container', 'flexGap5', 'interactable');
        loreTipsToggleButton.tabIndex = 0;
        loreTipsToggleButton.title = t`Toggle Lore Tips`; // Add translation

        const icon = document.createElement('i');
        icon.classList.add('fa-solid', 'fa-book-open'); // Choose an appropriate icon

        const span = document.createElement('span');
        span.textContent = t`Lore Tips`;

        loreTipsToggleButton.append(icon, span);
        loreTipsToggleContainer.append(loreTipsToggleButton);
        extensionsMenu.insertBefore(loreTipsToggleContainer, extensionsMenu.firstChild); // Add to the top of the menu

        // Set initial state based on settings
        loreTipsToggleContainer.classList.toggle('extension-disabled', !settings.enabled); // Use 'extension-disabled' class for visual toggle

        // Toggle functionality
        loreTipsToggleContainer.addEventListener('click', () => {
            settings.enabled = !settings.enabled; // Toggle the setting
            saveSettingsDebounced();
            ReBuildLore(); // Rebuild Lore Tips UI
            loreTipsToggleContainer.classList.toggle('extension-disabled', !settings.enabled); // Update toggle visual state
        });
    }


    const UpdatedWorldInfo = [
        event_types.WORLDINFO_UPDATED,
        event_types.WORLDINFO_SETTINGS_UPDATED,
    ];

    UpdatedWorldInfo.forEach(e => eventSource.on(e, async () => {
        await LoreTipGetLatest(); //Re-fetch lore data
        await ReBuildLore(); // Rebuild LoreTips UI and attach monitor with new data
    }));

})();
