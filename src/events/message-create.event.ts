import { Events, GuildMember, Message, type OmitPartialGroupDMChannel } from 'discord.js';
import type { AppEvent } from './event';
import { logger } from '@app/logger';
import type { AppContext } from '@app/context';
import type { Requester } from '@app/requester';
import { LoadResultType, type LavalinkSource, type Player } from '@app/link';
import { QueueType, updatePlayer } from '@app/player';
import { handleSearch, handleTrack } from '@app/player/handlers/agent';
import { agentPrompt, ResponsePrompt, ResponseType } from '@app/agent';

export const messageCreateEvent: AppEvent<Events.MessageCreate> = {
  event: Events.MessageCreate,
  once: false,
  execute: async (context, message) => {
    if (message.author.bot) return;

    logger.debug(`Received message`, {
      content: message.content,
      mentions: message.mentions
    });

    if (!message.mentions.users.has(context.applicationId)) return;
    if (!message.member) return;
    if (!message.guildId) return;

    const prompt = await agentPrompt({
      prompt: message.cleanContent,
      message,
      context
    });

    if (!prompt) return;

    const { link } = context;

    logger.debug(`Received webhook response`, { prompt });

    await message.reply({
      content: prompt.message
    });

    const player = link.findPlayerByGuildId(message.guildId);

    logger.debug(`Message type`, { type: prompt.type });

    switch (prompt.type) {
      case ResponseType.PLAY:
        await playMusic(context, {
          query: prompt.query,
          queueType: prompt.queueType,
          source: prompt.source,
          member: message.member,
          message
        });
        break;
      case ResponseType.REMOVE:
        player?.queue.slice(prompt.rangeStart + 1);
        break;
      case ResponseType.REMOVE_RANGE:
        player?.queue.slice(prompt.rangeStart, prompt.rangeEnd);
        break;
      case ResponseType.CLEAR_QUEUE:
        await player?.queue.clear();
        break;
      case ResponseType.CLEAR_EFFECT:
        await player?.filter.reset();
        break;
      case ResponseType.RESUME:
        await player?.resume();
        break;
      case ResponseType.SHUFFLE:
        player?.queue.shuffle();
        break;
      case ResponseType.PAUSE:
        await player?.pause();
        break;
      case ResponseType.STOP:
        await player?.queue.clear();
        await player?.stop();
        await player?.destroy();
        break;
      case ResponseType.SKIP:
        await player?.skip();
        break;
      case ResponseType.DISCONNECT:
        await player?.disconnect();
        break;
      default:
        break;
    }
  }
};

const playMusic = async (
  context: AppContext,
  options: {
    query: string;
    queueType: QueueType;
    source: LavalinkSource;
    member: GuildMember;
    message: OmitPartialGroupDMChannel<Message<boolean>>;
  }
) => {
  const { link } = context;
  const { query, message, member, source, queueType } = options;

  logger.debug(`Playing music`, { query, queueType });

  if (!member.voice.channel) {
    const prompt = await agentPrompt({
      prompt: ResponsePrompt.NOT_IN_VOICE_CHANNEL,
      message,
      context
    });

    if (!prompt) return;

    await message.reply({
      content: prompt.message
    });
    return;
  }

  const player = await link.createPlayer({
    guildId: member.guild.id,
    autoLeave: true
  });

  // Connect to the voice channel if not connected
  if (!player.voiceConnected) {
    await player.connect(member.voice.channel.id);
    logger.debug(`Connected to voice channel: ${member.voice.channel.name}`);
  }

  await handleQuery({
    query,
    player,
    member,
    message,
    context,
    queueType,
    source
  });

  if (message.guildId) {
    const pageKey = `player:page:${message.guildId}`;
    await context.redis.set(pageKey, 0);
    await updatePlayer(context, message.guildId);
  }
};

const handleQuery = async (
  options: {
    query: string;
    member: GuildMember;
    message: OmitPartialGroupDMChannel<Message<boolean>>;
    player: Player<Requester>;
    context: AppContext;
    source: LavalinkSource;
    queueType: QueueType;
  },
  retry = true,
  retryCount = 5
) => {
  const { query, player, source, queueType, context, member, message } = options;
  const { link } = context;

  const result = await link.search({
    query,
    source,
    userData: {
      userName: member.user.username,
      userId: member.user.id,
      textChannelId: message.channelId
    }
  });

  switch (result.loadType) {
    case LoadResultType.ERROR: {
      // Attempt to retry if search fails
      if (retry) {
        logger.debug('Error in track lookup, attempting to retry', { retryCount });

        setTimeout(async () => {
          await handleQuery(options, retryCount !== 0, retryCount - 1);
        }, 1000);
      } else {
        logger.debug('Give up in searching track', { retryCount });

        const prompt = await agentPrompt({
          prompt: ResponsePrompt.TRACK_LOAD_GIVEUP,
          message,
          context
        });

        if (!prompt) return;

        await message.reply({
          content: prompt.message
        });
      }
      break;
    }
    case LoadResultType.EMPTY: {
      logger.debug('Track came up empty', { retryCount });

      const prompt = await agentPrompt({
        prompt: ResponsePrompt.TRACK_LOAD_EMPTY,
        message,
        context
      });

      if (!prompt) return;

      await message.reply({
        content: prompt.message
      });
      return;
    }
    case LoadResultType.PLAYLIST: {
      if (!result) return;

      player.queue.enqueue(...result.data.tracks);

      if (!player.queue.current) {
        await player.play();
      }

      const prompt = await agentPrompt({
        prompt: ResponsePrompt.TRACK_LOAD_PLAYLIST,
        message,
        context
      });

      if (!prompt) return;

      await message.reply({
        content: prompt.message
      });
      break;
    }
    case LoadResultType.TRACK: {
      // Handle track result
      await handleTrack({ message, track: result.data, player, queueType });
      break;
    }
    case LoadResultType.SEARCH: {
      // Handle search result
      await handleSearch({ message, query, player, result, queueType });
      break;
    }
  }
};
