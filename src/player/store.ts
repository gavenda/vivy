import { redis } from 'vivy/redis';
import { QueueType } from './queue.type';

const playerEmbedKey = (guildId: string) => `player:embed:${guildId}`;
const playerPageKey = (guildId: string) => `player:page:${guildId}`;
const queueTypeKey = (userId: string) => `user-prefs:${userId}:queue-type`;
const queueQuestionAnsweredKey = (userId: string) => `user-prefs:${userId}:queue-question-answered`;

const isQueueType = (value: string): value is QueueType => (Object.values(QueueType) as string[]).includes(value);

export interface PlayerEmbedRef {
  channelId: string;
  messageId: string;
}

/**
 * The message holding the guild's player embed, if one was created and is still tracked.
 */
export const getPlayerEmbed = async (guildId: string): Promise<PlayerEmbedRef | undefined> => {
  const value = await redis.get(playerEmbedKey(guildId));

  if (!value) return;

  const [channelId, messageId] = value.split(':');

  if (!channelId || !messageId) return;

  return { channelId, messageId };
};

export const setPlayerEmbed = async (guildId: string, { channelId, messageId }: PlayerEmbedRef) => {
  await redis.set(playerEmbedKey(guildId), `${channelId}:${messageId}`);
};

export const clearPlayerEmbed = async (guildId: string) => {
  await redis.del(playerEmbedKey(guildId));
};

/**
 * The queue page the guild's player embed is showing, the first page when nothing is stored.
 */
export const getPlayerPage = async (guildId: string): Promise<number> => {
  return Number(await redis.get(playerPageKey(guildId))) || 0;
};

export const setPlayerPage = async (guildId: string, page: number) => {
  await redis.set(playerPageKey(guildId), `${page}`);
};

/**
 * The queue type the user asked to always use, if any.
 */
export const getQueueTypePreference = async (userId: string): Promise<QueueType | undefined> => {
  const value = await redis.get(queueTypeKey(userId));

  return value && isQueueType(value) ? value : undefined;
};

export const setQueueTypePreference = async (userId: string, queueType: QueueType) => {
  await redis.set(queueTypeKey(userId), queueType);
};

/**
 * Whether the user already answered the "remember this choice" question, so it is not asked again.
 */
export const hasAnsweredQueueQuestion = async (userId: string): Promise<boolean> => {
  return (await redis.exists(queueQuestionAnsweredKey(userId))) === true;
};

export const setQueueQuestionAnswered = async (userId: string) => {
  await redis.set(queueQuestionAnsweredKey(userId), '1');
};
