import {
    name2,
    eventSource,
    event_types,
    isStreamingEnabled,
    saveSettingsDebounced,
} from '../../../../script.js';
import {
  getActiveWorldInfo,
} from 'sillytavern-utils-lib';

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

    const inlineDrawerContent = document.createElement('div');
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
    });
    const enabledCheckboxText = document.createElement('span');
    enabledCheckboxText.textContent = t`Enabled`;
    enabledCheckboxLabel.append(enabledCheckbox, enabledCheckboxText);
    inlineDrawerContent.append(enabledCheckboxLabel);

    // Show if streaming
    const showIfStreamingCheckboxLabel = document.createElement('label');
    showIfStreamingCheckboxLabel.classList.add('checkbox_label');
    showIfStreamingCheckboxLabel.htmlFor = 'typingIndicatorShowIfStreaming';
    const showIfStreamingCheckbox = document.createElement('input');
    showIfStreamingCheckbox.id = 'typingIndicatorShowIfStreaming';
    showIfStreamingCheckbox.type = 'checkbox';
    showIfStreamingCheckbox.checked = settings.streaming;
    showIfStreamingCheckbox.addEventListener('change', () => {
        settings.streaming = showIfStreamingCheckbox.checked;
        saveSettingsDebounced();
    });
    const showIfStreamingCheckboxText = document.createElement('span');
    showIfStreamingCheckboxText.textContent = t`Show if streaming`;
    showIfStreamingCheckboxLabel.append(showIfStreamingCheckbox, showIfStreamingCheckboxText);
    inlineDrawerContent.append(showIfStreamingCheckboxLabel);
}

/**
 * Shows a typing indicator in the chat.
 * @param {string} type Generation type
 * @param {any} _args Generation arguments
 * @param {boolean} dryRun Is this a dry run?
 * @returns {void}
 */
function showTypingIndicator(type, _args, dryRun) {
    const settings = getSettings();
    const noIndicatorTypes = ['quiet', 'impersonate'];

    if (noIndicatorTypes.includes(type) || dryRun) {
        return;
    }

    if (!settings.enabled || !name2 || (!settings.streaming && isStreamingEnabled())) {
        return;
    }

    if (legacyIndicatorTemplate && selected_group && !isStreamingEnabled()) {
        return;
    }

    const textContent = t`${name2} is typing...`;
    const existingIndicator = document.getElementById('typing_indicator');
    if (existingIndicator) {
        existingIndicator.textContent = textContent;
        return;
    }

    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'typing_indicator';
    typingIndicator.classList.add('typing_indicator');
    typingIndicator.textContent = t`${name2} is typing`;
    $(typingIndicator).hide();

    const chat = document.getElementById('chat');
    if (chat) {
        chat.appendChild(typingIndicator);
        const wasChatScrolledDown = Math.ceil(chat.scrollTop + chat.clientHeight) >= chat.scrollHeight;
        $(typingIndicator).show(() => {
            if (!wasChatScrolledDown) {
                return;
            }

            const computedStyle = getComputedStyle(typingIndicator);
            const bottomOffset = parseInt(computedStyle.bottom) + parseInt(computedStyle.marginBottom);
            chat.scrollTop += typingIndicator.clientHeight + bottomOffset;
        });
    }
}

/**
 * Hides the typing indicator.
 */
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing_indicator');
    if (typingIndicator) {
        $(typingIndicator).hide(() => typingIndicator.remove());
    }
}

async function PrintWorldInfo() {
const entriesGroupByWorldName = await getActiveWorldInfo(['all'], this_chid);

    console.log(entriesGroupByWorldName)
}

(function () {
    const settings = getSettings();
    addExtensionSettings(settings);

    const showIndicatorEvents = [
        event_types.GENERATION_AFTER_COMMANDS,
    ];

    const hideIndicatorEvents = [
        event_types.GENERATION_STOPPED,
        event_types.GENERATION_ENDED,
        event_types.CHAT_CHANGED,
    ];

    PrintWorldInfo()

    showIndicatorEvents.forEach(e => eventSource.on(e, showTypingIndicator));
    hideIndicatorEvents.forEach(e => eventSource.on(e, hideTypingIndicator));
})();
