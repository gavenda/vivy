import { autocompleteInteraction } from './events/autocomplete-interaction.event';
import { chatInputCommandInteraction } from './events/chat-input-command-interaction.event';
import { guildAvailable } from './events/guild-available.event';
import { guildUnavailable } from './events/guild-unavailable.event';
import { buttonInteraction } from './events/player-button-interaction.event';
import { readyEvent } from './events/ready.event';

export const events = [
  autocompleteInteraction,
  buttonInteraction,
  chatInputCommandInteraction,
  readyEvent,
  guildAvailable,
  guildUnavailable
];
