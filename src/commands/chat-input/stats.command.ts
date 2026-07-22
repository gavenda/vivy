import type { AppContext } from 'vivy/context';
import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import i18next from 'i18next';
import type { AppChatInputCommand } from './chat-input-command';
import { redis } from 'bun';

const formatScore = (score: string | number | null | undefined) => `${Math.round(Number(score ?? 0))}`;

const formatTrackEntry = async (trackId: string, score: string | number | null | undefined) => {
  const meta = await redis.hgetall(`stats:track:meta:${encodeURIComponent(trackId)}`);
  const title = meta.title || trackId;
  const uri = meta.uri || '';
  const author = meta.author ? ` by ${meta.author}` : '';
  return uri
    ? `${formatScore(score)} plays — [${title}${author}](<${uri}>)`
    : `${formatScore(score)} plays — ${title}${author}`;
};

const formatUserEntry = (userId: string, score: string | number | null | undefined) => {
  const username = `<@${userId}>`;
  return `${formatScore(score)} music requests — ${username}`;
};

const buildTrackList = async (entries: [string, number][]) => {
  if (!entries || entries.length === 0) return '—';
  const rows: string[] = [];
  for (const [trackId, score] of entries) {
    rows.push(await formatTrackEntry(trackId, score));
  }
  return rows.join('\n');
};

const buildUserList = (entries: [string, number][]) => {
  if (!entries || entries.length === 0) return '—';
  const rows: string[] = [];
  for (const [userId, score] of entries) {
    rows.push(formatUserEntry(userId, score));
  }
  return rows.join('\n');
};

export const stats: AppChatInputCommand = {
  data: new SlashCommandBuilder().setName('stats').setDescription('Show music usage statistics.').toJSON(),
  execute: async (_context: AppContext, interaction) => {
    if (!interaction.guild || !interaction.guildId || !interaction.inGuild()) {
      await interaction.reply({
        content: i18next.t('reply.not_in_guild', { lng: interaction.locale }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply();

    const guildId = interaction.guildId;
    // These statistics are stored as sorted sets (ZINCRBY). Fetch top entries with scores.
    const topGuildTracks = await redis.zrevrange(`stats:guild:${guildId}:tracks:plays`, 0, 3, 'WITHSCORES');
    const topGuildUsers = await redis.zrevrange(`stats:guild:${guildId}:users:requests`, 0, 3, 'WITHSCORES');
    const topGlobalTracks = await redis.zrevrange('stats:tracks:plays', 0, 3, 'WITHSCORES');
    const topGlobalUsers = await redis.zrevrange('stats:users:requests', 0, 3, 'WITHSCORES');

    const guildTrackText =
      topGuildTracks && topGuildTracks.length
        ? await buildTrackList(topGuildTracks)
        : i18next.t('reply.stats_no_records', { lng: interaction.locale });
    const guildUserText =
      topGuildUsers && topGuildUsers.length
        ? buildUserList(topGuildUsers)
        : i18next.t('reply.stats_no_records', { lng: interaction.locale });
    const globalTrackText =
      topGlobalTracks && topGlobalTracks.length
        ? await buildTrackList(topGlobalTracks)
        : i18next.t('reply.stats_no_global_records', { lng: interaction.locale });
    const globalUserText =
      topGlobalUsers && topGlobalUsers.length
        ? buildUserList(topGlobalUsers)
        : i18next.t('reply.stats_no_global_records', { lng: interaction.locale });

    await interaction.editReply({
      content: `${i18next.t('reply.stats_top_guild_tracks', { lng: interaction.locale })}\n${guildTrackText}\n\n${i18next.t('reply.stats_top_guild_users', { lng: interaction.locale })}\n${guildUserText}\n\n${i18next.t('reply.stats_top_global_tracks', { lng: interaction.locale })}\n${globalTrackText}\n\n${i18next.t('reply.stats_top_global_users', { lng: interaction.locale })}\n${globalUserText}`
    });
  }
};
