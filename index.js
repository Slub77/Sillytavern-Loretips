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
    SelectLT: 9
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


async function PrintWorldInfo() {
    CachedLore = await getSortedEntries();
    console.log(CachedLore);
    return;
}

var CachedLore = []


function GenerateLoreTip() {

    if(document.getElementById("LoreTips") != undefined) { //we already have the loretip
        return;
    }
    
   // --- Create HTML Elements Dynamically ---
    const style = document.createElement('style');
    style.textContent = `
        #LoreTips {
            display: none;
            position: absolute;
            border: 1px solid #ccc;
            background-color: white;
            max-height: 60px;
            overflow-y: auto;
            z-index: 10; /* Ensure it's above the textarea if needed */
        }
        #LoreTips table {
            width: 100%;
            border-collapse: collapse; /* Optional: For cleaner table borders */
        }
        #LoreTips th, #LoreTips td {
            border: 1px solid #ddd; /* Optional: Add borders to table cells */
            padding: 8px;
            text-align: left;
            word-break: break-word; /* Ensure long words wrap */
            max-width: 50%; /* Limit width of each cell */
            overflow: hidden; /* Prevent content overflow */
            text-overflow: ellipsis; /* Indicate overflow with ellipsis */
            white-space: nowrap; /* Prevent line breaks in cells */
        }
        #loreTipsTableBody tr:hover {
            background-color: #f0f0f0; /* Highlight on hover */
        }
        #loreTipsTableBody tr.highlighted {
            background-color: #e0e0e0; /* Highlighted row */
        }
    `;
    document.head.appendChild(style);


    const loreTipsDiv = document.createElement('div');
    loreTipsDiv.id = 'LoreTips';

    const loreTipsTable = document.createElement('table');
    loreTipsDiv.appendChild(loreTipsTable);

    const tableHead = document.createElement('thead');
    loreTipsTable.appendChild(tableHead);

    const headerRow = document.createElement('tr');
    tableHead.appendChild(headerRow);

    const commentHeader = document.createElement('th');
    commentHeader.textContent = 'Comment';
    headerRow.appendChild(commentHeader);

    const triggersHeader = document.createElement('th');
    triggersHeader.textContent = 'Triggers';
    headerRow.appendChild(triggersHeader);


    const loreTipsTableBody = document.createElement('tbody');
    loreTipsTableBody.id = 'loreTipsTableBody';
    loreTipsTable.appendChild(loreTipsTableBody);



  
    
    document.body.appendChild(loreTipsDiv);

}


function AttachLoreMonitor() {

    const textarea = document.getElementById('send_textarea');
    const loreTipsDiv = document.getElementById('LoreTips');
    const loreTipsTableBody = document.getElementById('loreTipsTableBody');

    // Your data array (provided in the prompt)
    const loreData = [ /* ... your data array here ... */ ]; // **Important: Paste your data array here**


    let timeoutId;
    let currentWord = '';
    let lastInputValue = '';
    let highlightedRowIndex = 0;
    let visibleMatches = [];

    // Function to get the current word under the cursor
    function getCurrentWord() {
        const inputValue = textarea.value;
        const cursorPosition = textarea.selectionStart;
        let wordStart = 0;
        let wordEnd = inputValue.length;

        // Find start of the word
        for (let i = cursorPosition - 1; i >= 0; i--) {
            if (/\s/.test(inputValue[i])) {
                wordStart = i + 1;
                break;
            }
        }

        // Find end of the word
        for (let i = cursorPosition; i < inputValue.length; i++) {
            if (/\s/.test(inputValue[i])) {
                wordEnd = i;
                break;
            }
        }
        return inputValue.substring(wordStart, wordEnd);
    }


    // Function to search for triggers in loreData
    function searchTriggers(word) {
        if (!word) return [];
        const lowerWord = word.toLowerCase();
        return loreData.reduce((matches, entry) => {
            for (const key of entry.key) {
                if (typeof key === 'string') { // Handle string keys
                    const lowerKey = key.toLowerCase();
                    if (lowerKey.includes(lowerWord)) {
                        matches.push({ comment: entry.comment, triggers: entry.key });
                        return matches; // Return after first match in keys to avoid duplicates from same entry
                    }
                } else if (key instanceof RegExp) { // Handle regex keys (if any in future, currently not used for triggers)
                    if (key.test(word)) {
                        matches.push({ comment: entry.comment, triggers: entry.key });
                        return matches; // Return after first match in keys
                    }
                }
            }
            return matches;
        }, []);
    }


    // Function to display tooltips
    function displayTooltips(matches) {
        visibleMatches = matches;
        loreTipsTableBody.innerHTML = ''; // Clear previous results
        highlightedRowIndex = 0; // Reset highlight

        if (matches.length > 0) {
            loreTipsDiv.style.display = 'block';

            matches.forEach((match, index) => {
                const row = loreTipsTableBody.insertRow();
                const commentCell = row.insertCell(0);
                const triggersCell = row.insertCell(1);

                commentCell.textContent = match.comment;
                triggersCell.textContent = match.triggers.join(', ');

                if (index === highlightedRowIndex) {
                    row.classList.add('highlighted'); // Highlight first row initially
                }
            });
        } else {
            hideTooltips(); // Hide if no matches
        }
    }

    // Function to hide and clear tooltips
    function hideTooltips() {
        loreTipsDiv.style.display = 'none';
        loreTipsTableBody.innerHTML = '';
        visibleMatches = [];
        highlightedRowIndex = 0;
    }


    // Function to handle input with debounce
    function handleInput() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            const currentInputWord = getCurrentWord();
            if (currentInputWord !== currentWord || textarea.value !== lastInputValue) {
                currentWord = currentInputWord;
                lastInputValue = textarea.value;
                const matches = searchTriggers(currentWord);
                displayTooltips(matches);
            }
        }, 200);
    }

    // Function to reset highlight to the top row if list changes
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


    // Event listeners
    textarea.addEventListener('focus', function() {
        // Check word on focus if needed (implementation for cursor move focus below covers this)
    });

    textarea.addEventListener('blur', function() {
        hideTooltips();
        currentWord = ''; // Reset current word on blur
    });

    textarea.addEventListener('input', handleInput);


    textarea.addEventListener('keydown', function(event) {
        if (event.key === ' ' || event.key === 'Spacebar') { // Handle space key to hide tooltip
            hideTooltips();
            currentWord = ''; // Reset current word on space
        } else if (event.ctrlKey && (event.key === 'ArrowDown' || event.key === 'Down')) {
            event.preventDefault(); // Prevent default scroll
            navigateTooltips(1); // 1 for down
        } else if (event.ctrlKey && (event.key === 'ArrowUp' || event.key === 'Up')) {
            event.preventDefault(); // Prevent default scroll
            navigateTooltips(-1); // -1 for up
        }
    });


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


    // --- Cursor position change or re-focus logic ---
    textarea.addEventListener('mouseup', handleCursorMove); // Mouse click to move cursor
    textarea.addEventListener('keyup', handleCursorMove);   // Arrow keys to move cursor

    function handleCursorMove() {
        if (textarea === document.activeElement) { // Only if textarea is focused
            const currentInputWord = getCurrentWord();
            if (currentInputWord) {
                if (currentInputWord !== currentWord) {
                    currentWord = currentInputWord;
                    const matches = searchTriggers(currentWord);
                    displayTooltips(matches);
                    resetHighlight(); // Reset highlight when list updates due to cursor move
                }
            } else {
                hideTooltips(); // Hide if no word under cursor
                currentWord = '';
            }
        }
    }


    // --- Initial setup for LoreTips width ---
    function setLoreTipsWidth() {
        loreTipsDiv.style.width = textarea.offsetWidth + 'px';
    }

    setLoreTipsWidth(); // Set initial width
    window.addEventListener('resize', setLoreTipsWidth); // Adjust width on window resize

}


(async function () {
    const settings = getSettings();
    addExtensionSettings(settings);



    await PrintWorldInfo();
    GenerateLoreTip();
    AttachLoreMonitor();
    
})();
