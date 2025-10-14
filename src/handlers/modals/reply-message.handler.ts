import { MessageFlags } from 'discord.js';
import type { AppModalSubmitHandler } from './modal-handler';

export const replyMessageHandler: AppModalSubmitHandler = {
  customId: 'modal:reply-message',
  handle: async (_, interaction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const messageId = interaction.fields.getTextInputValue('modal:message-id');

    const message = interaction.channel?.messages.cache.get(messageId);

    if (message) {
      await message.reply({
        content: interaction.fields.getTextInputValue('modal:message')
      });
    }

    await interaction.followUp({ content: 'Message sent!' });
  }
};
