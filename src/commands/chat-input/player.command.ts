import { logger } from 'vivy/logger';
import { createPlayerComponentsV2 } from 'vivy/player';
import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';
import { redis } from 'bun';

export const player: AppChatInputCommand = {
  data: new SlashCommandBuilder().setName('player').setDescription('Creates a music player in this channel.').toJSON(),
  execute: async (context, interaction) => {
    if (!interaction.guild || !interaction.guildId || !interaction.inGuild()) {
      await interaction.reply({
        content: i18next.t('reply.not_in_guild', { lng: interaction.locale }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (!interaction.channel) {
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
    const previousPlayer = await redis.get(`player:embed:${interaction.guildId}`);

    if (previousPlayer) {
      try {
        const [previousChannelId, previousMessageId] = previousPlayer.split(':');

        if (!previousChannelId) return;
        if (!previousMessageId) return;

        const previousChannel = await client.channels.fetch(previousChannelId);

        if (previousChannel?.isTextBased()) {
          const previousMessage = await previousChannel.messages.fetch(previousMessageId);

          if (previousMessage.author.id === client?.user?.id) {
            logger.debug('Removing previous message', { previousMessageId });
            await previousMessage.delete();
          }
        }
      } catch (e: unknown) {
        logger.warn(`Unable to delete previous message`, { guildId: interaction.guildId, e });
      }
    }

    const container = createPlayerComponentsV2(context, interaction.guildId);

    const message = await interaction.channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });

    await redis.set(`player:embed:${interaction.guildId}`, `${interaction.channelId}:${message.id}`);

    await interaction.followUp({
      content: i18next.t('reply.player_embed_created', { lng: interaction.locale, channelId: interaction.channelId }),
      flags: MessageFlags.Ephemeral
    });
  }
};
