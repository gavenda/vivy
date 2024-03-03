import { SlashCommandBuilder } from 'discord.js';
import { AppCommand } from './command';
import { createPlayerEmbed, createPlayerComponents } from '@/app.player';
import { logger } from '@/logger';

export const player: AppCommand = {
  data: new SlashCommandBuilder()
    .setName('player')
    .setDescription('Creates a music player in this channel.'),
  execute: async (context, interaction) => {
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({
        content: `You are not in a guild.`,
        ephemeral: true
      });
      return;
    }

    if (!interaction.channel) {
      await interaction.reply({
        content: `You are not in a text channel.`,
        ephemeral: true
      });
      return;
    }

    const { client, redis } = context;

    // Might take long contacting redis, defer
    await interaction.deferReply({
      ephemeral: true
    });

    // Delete previous message, if any
    const previousPlayer = await redis.get(`player:${interaction.guildId}`);

    if (previousPlayer) {
      try {
        const [previousChannelId, previousMessageId] = previousPlayer.split(':');
        const previousChannel = await client.channels.fetch(previousChannelId);

        if (previousChannel?.isTextBased()) {
          const previousMessage = await previousChannel.messages.fetch(previousMessageId);

          if (previousMessage.author.id === client?.user?.id) {
            logger.debug('Removing previous message', { previousMessageId });
            await previousMessage.delete();
          }
        }
      } catch (e) {
        logger.warn(`Unable to delete previous message`, { guildId: interaction.guildId });
      }
    }

    const playerEmbed = createPlayerEmbed(context, interaction.guildId);
    const playerComponents = createPlayerComponents(context, interaction.guildId);

    const message = await interaction.channel.send({
      embeds: [playerEmbed],
      components: playerComponents
    });

    await redis.set(`player:${interaction.guildId}`, `${interaction.channelId}:${message.id}`);

    await interaction.followUp({
      content: `Created player in <#${interaction.channelId}>`,
      ephemeral: true
    });
  }
};
