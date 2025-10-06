import type { AppContext } from '@app/context';
import { LoadResultType, Player } from '@app/link';
import { LISTEN_MOE_JPOP_M38U, LISTEN_MOE_KPOP_M38U, RadioType } from '@app/listen.moe';
import { updatePlayer } from '@app/player';
import type { Requester } from '@app/requester';
import { hasVoiceState } from '@app/utils/has-voice-state';
import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder
} from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';

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
    if (!interaction.guild || !interaction.guildId || !interaction.inGuild()) {
      await interaction.reply({
        content: i18next.t('reply.not_in_guild', { lng: interaction.locale }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    if (!hasVoiceState(interaction.member)) {
      await interaction.reply({
        content: i18next.t('reply.illegal_non_gateway_request', { lng: interaction.locale }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    if (!interaction.member.voice.channel) {
      await interaction.reply({
        content: i18next.t('reply.not_in_voice', { lng: interaction.locale }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const { guildId } = interaction;
    const { link } = context;

    const player = link.findPlayerByGuildId(guildId);

    if (!player) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: i18next.t('reply.not_playing', { lng: interaction.locale })
      });
      return;
    }

    const type = interaction.options.getSubcommand(true);
    const radioType = type === 'anime' ? RadioType.JPOP : RadioType.KPOP;

    if (!player.voiceConnected) {
      await player.connect(interaction.member.voice.channel.id);
    }

    const listenAttempt = listenToRadio({ guildId, context, player, interaction, radioType });

    if (!listenAttempt) {
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

const listenToRadio = async (options: {
  guildId: string;
  context: AppContext;
  player: Player<Requester>;
  interaction: ChatInputCommandInteraction;
  radioType: RadioType;
}) => {
  const { interaction, guildId, context, radioType, player } = options;
  const { link } = context;
  const loadResult = await link.search({
    query: radioType === RadioType.JPOP ? LISTEN_MOE_JPOP_M38U : LISTEN_MOE_KPOP_M38U,
    userData: {
      textChannelId: interaction.channelId,
      userName: interaction.user.username,
      userId: interaction.user.id
    }
  });

  switch (loadResult.loadType) {
    case LoadResultType.TRACK:
      await player.queue.clear();
      await player.stop();
      await player.play(loadResult.data);
      await updatePlayer(context, guildId);
      return true;
    case LoadResultType.ERROR:
      return false;
  }

  return true;
};
