import type { AppContext } from 'vivy/context';
import type { Player } from 'vivy/link';
import type { Requester } from 'vivy/requester';
import { hasVoiceState } from 'vivy/utils';
import { MessageFlags, type ChatInputCommandInteraction, type VoiceBasedChannel } from 'discord.js';
import i18next from 'i18next';

export interface VoiceSession {
  guildId: string;
  /**
   * The voice channel the user is in.
   */
  voiceChannel: VoiceBasedChannel;
}

export interface PlayerSession extends VoiceSession {
  player: Player<Requester>;
}

const replyEphemeral = async (interaction: ChatInputCommandInteraction, key: string) => {
  await interaction.reply({
    content: i18next.t(key, { lng: interaction.locale }),
    flags: MessageFlags.Ephemeral
  });
};

/**
 * Requires the command to be used in a guild.
 * Replies to the user and resolves with nothing when the requirement is not met.
 */
export const requireGuild = async (interaction: ChatInputCommandInteraction): Promise<string | undefined> => {
  if (!interaction.guild || !interaction.guildId || !interaction.inGuild()) {
    await replyEphemeral(interaction, 'reply.not_in_guild');
    return;
  }

  return interaction.guildId;
};

/**
 * Requires the command to be used in a guild by someone who is in a voice channel.
 * Replies to the user and resolves with nothing when a requirement is not met.
 */
export const requireVoice = async (interaction: ChatInputCommandInteraction): Promise<VoiceSession | undefined> => {
  const guildId = await requireGuild(interaction);

  if (!guildId) return;

  if (!hasVoiceState(interaction.member)) {
    await replyEphemeral(interaction, 'reply.illegal_non_gateway_request');
    return;
  }

  const voiceChannel = interaction.member.voice.channel;

  if (!voiceChannel) {
    await replyEphemeral(interaction, 'reply.not_in_voice');
    return;
  }

  return { guildId, voiceChannel };
};

/**
 * Requires everything {@link requireVoice} does, and that the guild already has a player.
 * Replies to the user and resolves with nothing when a requirement is not met.
 */
export const requirePlayer = async (
  context: AppContext,
  interaction: ChatInputCommandInteraction
): Promise<PlayerSession | undefined> => {
  const session = await requireVoice(interaction);

  if (!session) return;

  const player = context.link.findPlayerByGuildId(session.guildId);

  if (!player) {
    await replyEphemeral(interaction, 'reply.not_playing');
    return;
  }

  return { ...session, player };
};
