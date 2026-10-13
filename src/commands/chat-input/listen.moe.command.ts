import { RadioType } from 'vivy/listen.moe';
import { playRadio } from 'vivy/player';
import { MessageFlags, SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';
import { requirePlayer } from './guards';

export const listenMoe: AppChatInputCommand = {
  data: new SlashCommandBuilder()
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('anime')
        .setDescription('Listen to an anime radio stream provided by Listen.MOE')
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName('k-pop')
        .setDescription('Listen to a k-pop radio stream provided by Listen.MOE')
    )
    .setName('radio')
    .setDescription('Listen to a radio')
    .toJSON(),
  execute: async (context, interaction) => {
    const session = await requirePlayer(context, interaction);

    if (!session) return;

    const { voiceChannel, player } = session;

    const type = interaction.options.getSubcommand(true);
    const radioType = type === 'anime' ? RadioType.JPOP : RadioType.KPOP;

    if (!player.voiceConnected) {
      await player.connect(voiceChannel.id);
    }

    const played = await playRadio(context, player, radioType, {
      userId: interaction.user.id,
      userName: interaction.user.username,
      textChannelId: interaction.channelId
    });

    if (!played) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: i18next.t('reply.error_radio', { lng: interaction.locale })
      });
      return;
    }

    if (radioType === RadioType.JPOP) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: i18next.t('reply.listen_jpop', { lng: interaction.locale })
      });
    } else {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: i18next.t('reply.listen_kpop', { lng: interaction.locale })
      });
    }
  }
};
