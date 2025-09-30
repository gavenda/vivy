import type { AppContext } from '@app/context';
import type { ModalSubmitInteraction } from 'discord.js';

export interface AppModalSubmitHandler {
  customId: string;
  handle: (context: AppContext, interaction: ModalSubmitInteraction) => Promise<void>;
}
