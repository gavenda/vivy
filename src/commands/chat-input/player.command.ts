import { createPlayerComponentsV2, getPlayerEmbed, setPlayerEmbed } from 'vivy/player';
import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';
import { requireGuild } from './guards';
import { getLogger } from '@logtape/logtape';

const logger = getLogger(['vivy', 'command:player']);

export const player: AppChatInputCommand = {
  data: new SlashCommandBuilder().setName('player').setDescription('Creates a music player in this channel.').toJSON(),
  execute: async (context, interaction) => {
    const guildId = await requireGuild(interaction);

    if (!guildId) return;

    if (!interaction.channel?.isSendable()) {
      await interaction.reply({
        content: i18next.t('reply.not_in_text_channel', { lng: interaction.locale }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const { client } = context;

    // Might take long contacting redis, defer
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral
    });

    // Delete previous message, if any
    const previousPlayer = await getPlayerEmbed(guildId);

    if (previousPlayer) {
      try {
        const previousChannel = await client.channels.fetch(previousPlayer.channelId);

        if (previousChannel?.isTextBased()) {
          const previousMessage = await previousChannel.messages.fetch(previousPlayer.messageId);

          if (previousMessage.author.id === client?.user?.id) {
            logger.debug('Removing previous message', { previousMessageId: previousPlayer.messageId });
            await previousMessage.delete();
          }
        }
      } catch (e: unknown) {
        logger.warn({ message: `Unable to delete previous message`, guildId, e });
      }
    }

    const container = createPlayerComponentsV2(context, guildId);

    const message = await interaction.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });

    await setPlayerEmbed(guildId, { channelId: interaction.channelId, messageId: message.id });

    await interaction.followUp({
      content: i18next.t('reply.player_embed_created', { lng: interaction.locale, channelId: interaction.channelId }),
      flags: MessageFlags.Ephemeral
    });
  }
};
