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
    delay : 200,
    viewkey: 69,
    cycleUp: 38,
    cycleDown: 40,
    SelectLT: 9,
    rowstoshow:2,
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

    inlineDrawer.append(inlineDrawerToggle, inlineDrawerContent);

    // Enabled
    const enabledCheckboxLabel = document.createElement('label');
    enabledCheckboxLabel.classList.add('checkbox_label');
    enabledCheckboxLabel.htmlFor = 'typingIndicatorEnabled';
    const enabledCheckbox = document.createElement('input');
    enabledCheckbox.id = 'lootTipEnabled';
    enabledCheckbox.type = 'checkbox';
    enabledCheckbox.checked = settings.enabled;
    enabledCheckbox.addEventListener('change', () => {
        settings.enabled = enabledCheckbox.checked;
        saveSettingsDebounced();
        ReBuildLore();
    });
    const enabledCheckboxText = document.createElement('span');
    enabledCheckboxText.textContent = t`Enabled`;
    enabledCheckboxLabel.append(enabledCheckbox, enabledCheckboxText);
    inlineDrawerContent.append(enabledCheckboxLabel);

    let inlineDrawerContent2 = document.createElement('div');
    inlineDrawerContent2.classList.add('inline-drawer-content');

     //Refresh Lore Fail Safe  Button
    const ReBuuild = document.createElement(`input`);
    ReBuuild.type = 'button';
    ReBuuild.value  = "Rebuild";
    ReBuuild.addEventListener('click', () => {
            //console.log("Sam Button! Rebuild");
            ReBuildLore();
    });
    inlineDrawerContent2.append(ReBuuild);
    inlineDrawer.append(inlineDrawerContent2);

     inlineDrawerContent2 = document.createElement('div');
    inlineDrawerContent2.classList.add('inline-drawer-content');
    //Rows to Show

     const LoreRowsToShowLabel = document.createElement('span');
    LoreRowsToShowLabel.innerHTML = "Rows to show"
    LoreRowsToShowLabel.style.padding = "3px"
    LoreRowsToShowLabel.style.fontWeight = "bold"

    const LoreRowsToShow = document.createElement(`input`);
    LoreRowsToShow.type = 'number';
    LoreRowsToShow.value  = settings.rowstoshow;
    LoreRowsToShow.min  = 1;
    LoreRowsToShow.max  = 20;
    LoreRowsToShow.step  = 1;
    LoreRowsToShow.classList.add('text_pole')


    LoreRowsToShow.addEventListener('change', () => {

        if(!isNaN(LoreRowsToShow.value)) {
            settings.rowstoshow = LoreRowsToShow.value;
            saveSettingsDebounced();
            ReBuildLore();
        }
    });

    inlineDrawerContent2.append(LoreRowsToShowLabel, LoreRowsToShow);
    inlineDrawer.append(inlineDrawerContent2);





}



async function LoreTipGetLatest() {
    CachedLore = await getSortedEntries();
    PreProcessLore(); // Preprocess lore data after fetching latest
    ////console.log(CachedLore);
    return;
}

var CachedLore = []
let stringLoreData = []; // Data for string-based triggers (moved to module scope)
let regexLoreData = [];   // Data for regex triggers   (moved to module scope)


    // Pre-process lore data to separate string and regex triggers (Moved outside GenerateLoreTip to module scope)
    function PreProcessLore() {
        stringLoreData = []; // Clear existing data on re-process
        regexLoreData = [];
        CachedLore.forEach(entry => {
            const stringKeys = [];
            const regexKeys = [];

            entry.key.forEach(key => {
                if (typeof key === 'string' && key.startsWith('/') && key.endsWith('/')) {
                    // Assume regex if starts and ends with '/'
                    const regexPattern = key.slice(1, -1); // Remove delimiters
                    try {
                        const regex = new RegExp(regexPattern, 'i'); // 'i' for case-insensitive, add flags as needed
                        regexKeys.push(regex);
                    } catch (e) {
                        console.warn(`Invalid regex pattern: ${key} in entry: ${entry.comment}. Treating as string.`);
                        stringKeys.push(key); // Treat as string if regex is invalid
                    }
                } else if (typeof key === 'string') {
                    stringKeys.push(key); // Treat as string if not regex delimited
                } else {
                    console.warn(`Non-string key encountered in entry: ${entry.comment}. Ignoring key:`, key);
                }
            });

            if (regexKeys.length > 0) {
                regexLoreData.push({...entry, key: regexKeys}); // Create new entry with regex keys
            }
            if (stringKeys.length > 0) {
                 stringLoreData.push({...entry, key: stringKeys}); // Create new entry with string keys
            }
        });
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
            background-color: var(--SmartThemeBlurTintColor);
            max-height: ${settings.rowstoshow * 60}px;
            overflow-y: auto;
            max-width:1200px;
            z-index: 200; /* Ensure it's above the textarea if needed */
            opacity:0.4;
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
            color: var(--SmartThemeBodyColor);
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

    //console.log("Slub: Added LoreTip")

}


function AttachLoreMonitor() {

    const UserChatBox = document.getElementById('send_textarea');
    const loreTipsDiv = document.getElementById('LoreTips');
    const loreTipsTableBody = document.getElementById('loreTipsTableBody');

    // Your data array (provided in the prompt) - now using preprocessed data
    const loreData = CachedLore;


    let timeoutId;
    let currentInputString = ''; // Renamed from currentWord
    let lastInputValue = '';
    let highlightedRowIndex = 0;
    let visibleMatches = [];
    let potentialMatchesMemory = [];
    let activeRegexMatches = []; // Store currently active regex matches
    let regexCheckTimeout; // Timer for regex checks
    const regexCheckInterval = 1000; // Check regex every 1 second (adjust as needed)


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
                    matches.push({ comment: entry.comment, triggers: entry.key, content: entry.content, entry: entry, isRegex: false }); // isRegex flag
                    return matches;
                }
            }
            return matches;
        }, []);
    }


    // Function to search for REGEX triggers (Separate slower check)
    function searchRegexTriggers(fullInput) { // Now takes the full input string
        if (!fullInput) return [];
        return regexLoreData.reduce((matches, entry) => { // Use regexLoreData here
            if(entry.disable) return matches;
            for (const key of entry.key) { // entry.key is now always RegExp[]
                if (key instanceof RegExp) { // Explicitly check for RegExp object
                    if (key.test(fullInput)) { // Test against the FULL input
                        matches.push({ comment: entry.comment, triggers: entry.key.map(r => r.toString()), content: entry.content, entry: entry, isRegex: true }); // isRegex flag, store regex as string for display
                        return matches;
                    }
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
                    //Adjust Height based on total rows - Existing logic
                    const textarea = document.getElementById('form_sheld');
                    const textareaRect = textarea.getBoundingClientRect();
                    const settings = getSettings();

                    let CalcNeededHeight = Math.min(visibleMatches.length, settings.rowstoshow) // Use visibleMatches.length

                    // Position LoreTips 80px above the textarea and same left alignment - Existing logic
                    loreTipsDiv.style.top = (textareaRect.top + window.scrollY - (CalcNeededHeight * 30) - 10) + 'px'; // Adjusted height calculation
                    loreTipsDiv.style.left = textareaRect.left + 16 + 'px';

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
        regexCheckTimeout = setTimeout(() => {
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

    let CalcNeededHeight = Math.min(document.getElementById('loretableslub').rows.length,settings.rowstoshow)

    // Position LoreTips 80px above the textarea and same left alignment
    loreTipsDiv.style.top = (textareaRect.top + window.scrollY - (CalcNeededHeight * 30) - 10) + 'px'; // Adjusted height calculation
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


    const UpdatedWorldInfo = [
        event_types.WORLDINFO_UPDATED,
        event_types.WORLDINFO_SETTINGS_UPDATED,
    ];

    UpdatedWorldInfo.forEach(e => eventSource.on(e, async () => {
        await LoreTipGetLatest(); //Re-fetch lore data
        await ReBuildLore(); // Rebuild LoreTips UI and attach monitor with new data
    }));

})();
