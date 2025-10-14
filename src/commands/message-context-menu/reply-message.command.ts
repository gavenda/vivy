import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ContextMenuCommandBuilder,
  InteractionContextType,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  type ModalActionRowComponentBuilder
} from 'discord.js';
import type { AppUserContextMenuCommand } from './message-context-menu-command';

export const replyMessage: AppUserContextMenuCommand = {
  data: new ContextMenuCommandBuilder()
    .setName('Reply to Message')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setType(ApplicationCommandType.Message)
    .toJSON(),
  execute: async (_, interaction) => {
    const modal = new ModalBuilder().setCustomId('modal:reply-message').setTitle('Reply to Message');

    const messageIdInput = new TextInputBuilder()
      .setCustomId('modal:message-id')
      .setLabel('Message ID')
      .setRequired(true)
      .setValue(interaction.targetMessage.id)
      .setStyle(TextInputStyle.Short);

    const textInput = new TextInputBuilder()
      .setCustomId('modal:message')
      .setLabel('Message')
      .setPlaceholder('Write your reply to the message here...')
      .setRequired(true)
      .setStyle(TextInputStyle.Paragraph);

    const actionRowId = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(messageIdInput);
    const actionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(textInput);

    modal.addComponents(actionRowId, actionRow);

    await interaction.showModal(modal);
  }
};
