import { autocompleteInteraction } from './events/autocomplete-interaction.event.js';
import { chatInputCommandInteraction } from './events/chat-input-command-interaction.event.js';

export const events = [autocompleteInteraction, chatInputCommandInteraction];
