import { getLogger } from '@logtape/logtape';
import { isAutoplayTrack, queueEncore } from './autoplay';
import type { AppContext } from './context';
import { recordTrackMetrics } from './stats/preference';
import { TrackEndReason } from './link';
import { LISTEN_MOE_JPOP_STREAM, LISTEN_MOE_KPOP_STREAM, LISTEN_MOE_STREAMS, RadioType } from './listen.moe';
import { updatePlayer } from './player';
import { recordTrackStatistics } from './stats/track';

const logger = getLogger(['vivy', 'link']);

export const registerLinkEvents = (context: AppContext) => {
  const { client, link, listenMoe } = context;

  link.on('nodeReady', async (node) => {
    logger.info({ message: 'Connected to node', host: node.options.host });

    for (const guild of client.guilds.cache.values()) {
      await link.createPlayer({ guildId: guild.id, autoLeave: true });
    }
  });

  link.on('nodeError', (node, error) => {
    logger.error({ message: 'Error on node', host: node.options.host, error });
  });

  link.on('nodeResumed', (node) => {
    logger.info({ message: 'Session resumed', host: node.options.host });
  });

  link.on('nodeDisconnected', (node) => {
    logger.debug({ message: 'Disconnected from node', host: node.options.host });
  });

  link.on('playerMove', (player, oldVoiceChannelId, newVoiceChannelId) => {
    logger.debug('Player moved', { guildId: player.guildId, oldVoiceChannelId, newVoiceChannelId });
  });

  link.on('playerSocketClosed', (player, code, byRemote, reason) => {
    logger.debug('Player socket closed', { guildId: player.guildId, code, byRemote, reason });
  });

  link.on('trackStart', async (player, track) => {
    logger.debug('Track start', { title: track.info.title, guild: player.guildId });

    if (track.info.identifier === LISTEN_MOE_JPOP_STREAM) {
      listenMoe.connect(RadioType.JPOP);
    }
    if (track.info.identifier === LISTEN_MOE_KPOP_STREAM) {
      listenMoe.connect(RadioType.KPOP);
    }

    // Autoplay is requested by the bot itself, it must not show up as a top user
    if (!isAutoplayTrack(context, track)) {
      await recordTrackStatistics(player, track);
    }
    await updatePlayer(context, player.guildId);
  });

  link.on('trackEnd', async (player, track, reason) => {
    logger.debug('Track end', { title: track.info.title, guild: player.guildId, reason });

    if (LISTEN_MOE_STREAMS.includes(track.info.identifier)) {
      listenMoe.disconnect();
    }

    // A natural finish is a positive signal and a skip a negative one. An explicit stop is ignored,
    // it may just mean someone is leaving.
    // Finishing an autoplayed track is not a signal, the bot picked it itself. Skipping one still is.
    if (reason === TrackEndReason.FINISHED) {
      if (!isAutoplayTrack(context, track)) {
        await recordTrackMetrics(player, track, true);
      }
      await queueEncore(context, player, track);
    } else if (reason === TrackEndReason.REPLACED) {
      await recordTrackMetrics(player, track, false);
    }

    await updatePlayer(context, player.guildId);
  });

  link.on('queueEnd', () => {
    logger.debug('Queue end');
  });

  link.on('trackError', async (player, track, exception) => {
    logger.error('Track error', { title: track.info.title, guild: player.guildId, exception });
    await player.skip();
  });

  link.on('trackStuck', async (player, track) => {
    logger.debug('Track stuck', { title: track.info.title, guild: player.guildId });
    await player.skip();
  });
};
