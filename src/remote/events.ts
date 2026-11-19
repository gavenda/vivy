import { getLogger } from '@logtape/logtape';
import { Events } from 'discord.js';
import pDebounce from 'p-debounce';
import type { AppContext } from 'vivy/context';
import type { Player } from 'vivy/link';
import { onPlayerChange } from 'vivy/player';
import { redis } from 'vivy/redis';
import type { Requester } from 'vivy/requester';
import { REMOTE_PROTOCOL_VERSION, RemoteChannel, type RemoteEvent } from './contract';
import { toGuildState } from './serialize';

const logger = getLogger(['vivy', 'remote']);

/** Tells this run of Vivy apart from the next, whose `seq` starts over. */
export const instanceId = crypto.randomUUID();

let seq = 0;

/** Bursts of changes (a track ending and the next starting) go out as one state. */
const STATE_DELAY_MS = 500;

export const publishEvent = async (event: RemoteEvent) => {
  try {
    await redis.publish(RemoteChannel.event, JSON.stringify(event));
  } catch (error) {
    logger.warn({ message: 'Unable to publish remote event', type: event.type, error });
  }
};

const publishState = (context: AppContext, guildId: string) =>
  publishEvent({
    v: REMOTE_PROTOCOL_VERSION,
    type: 'state',
    instanceId,
    seq: ++seq,
    state: toGuildState(context, guildId)
  });

/** Lavalink's position report for a playing track, sent as is: it comes every few seconds already. */
const publishProgress = (player: Player<Requester>) => {
  const current = player.queue.current;

  if (!current) return;

  void publishEvent({
    v: REMOTE_PROTOCOL_VERSION,
    type: 'progress',
    instanceId,
    seq: ++seq,
    guildId: player.guildId,
    identifier: current.info.identifier,
    paused: !player.playing,
    positionMs: Math.min(player.position, current.info.isStream ? Infinity : current.info.length),
    positionAt: player.positionAt,
    rate: player.rate
  });
};

const pendingStates = new Map<string, typeof publishState>();

/** Debounced per guild, a single shared debounce would drop the state of every guild but the last one. */
const scheduleState = (context: AppContext, guildId: string) => {
  let publish = pendingStates.get(guildId);

  if (!publish) {
    publish = pDebounce(publishState, STATE_DELAY_MS);
    pendingStates.set(guildId, publish);
  }

  void publish(context, guildId);
};

/** Publishes a guild's state whenever its player changes. */
export const registerRemoteEvents = (context: AppContext) => {
  const { client, link } = context;
  const schedule = (guildId: string) => scheduleState(context, guildId);

  // Tracks starting and ending, commands and buttons
  onPlayerChange(schedule);

  // What changes without the player embed being updated
  link.on('queueEnd', (player) => schedule(player.guildId));
  link.on('playerDestroy', (player) => schedule(player.guildId));
  link.on('playerConnected', (player) => schedule(player.guildId));
  // Vivy joining, moving or leaving voice, including leaving an empty channel and being kicked, which the player
  // doesn't report
  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    if (newState.id === client.user?.id && oldState.channelId !== newState.channelId) schedule(newState.guild.id);
  });
  // Where the playing track is, and how fast it moves
  link.on('playerUpdate', publishProgress);
  link.on('trackError', (player) => schedule(player.guildId));
  link.on('trackStuck', (player) => schedule(player.guildId));
  // Players were restored from the last run
  link.on('nodeReady', (node) => node.players.forEach((player) => schedule(player.guildId)));
};
