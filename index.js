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
                    //Adjust Height based on total rows - Existing logic
                    const textarea = document.getElementById('form_sheld');
                    const textareaRect = textarea.getBoundingClientRect();


                    let CalcNeededHeight = Math.min(visibleMatches.length, settings.rowstoshow) // Use visibleMatches.length

                    // Position LoreTips 80px above the textarea and same left alignment - Existing logic
                    loreTipsDiv.style.top = (textareaRect.top + window.scrollY - (CalcNeededHeight * 30) - 10) + 'px'; // Adjusted height calculation


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
        regexCheckTimeout = setTimeout(() => {
            if (settings.debugMode) console.log("LoreTips: regexCheckTimeout FIRING"); // **DEBUG LOG - Is the timer firing?**
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


        let CalcNeededHeight = Math.min(document.getElementById('loretableslub')?.rows?.length || 0,settings.rowstoshow)


        let topOffset = 0;
        if (settings.tooltipPosition === "above") {
            topOffset = (CalcNeededHeight * 30) + 10; // Adjusted for 30px row height
        } else if (settings.tooltipPosition === "top") {
            topOffset = -(loreTipsDiv.offsetHeight + 10) ; // Position at the top of the screen (adjust as needed) - needs proper height detection
            if (CalcNeededHeight > 0 ) topOffset = 10; // if we have rows, move it down slightly from top
             else topOffset = -10; // move it up slightly if no rows
        }


        // Position LoreTips  based on settings
        loreTipsDiv.style.top = (textareaRect.top + window.scrollY - topOffset ) + 'px';
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
