import { Events, GuildMember, Message, type OmitPartialGroupDMChannel } from 'discord.js';
import type { AppEvent } from './event';
import { logger } from '@app/logger';
import type { AppContext } from '@app/context';
import i18next from 'i18next';
import type { Requester } from '@app/requester';
import { LoadResultType, type LavalinkSource, type Player } from '@app/link';
import { QueueType, updatePlayer } from '@app/player';
import { handleSearch, handleTrack } from '@app/player/handlers/agent';

interface WebhookResponse {
  type: string;
  message: string;
  query: string;
  source: LavalinkSource;
  queueType: QueueType;
}

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
    if (!process.env.N8N_AGENT_WEBHOOK) return;
    if (!process.env.N8N_AGENT_WEBHOOK_SECRET) return;
    if (!message.member) return;

    // Send to gpt agent webhook.

    const body = {
      message: message.cleanContent
    };

    const headers = {
      'Content-Type': `application/json`,
      'Discord-User-Id': message.author.id,
      'Authorization': `Bearer ${process.env.N8N_AGENT_WEBHOOK_SECRET}`
    };

    logger.debug(`Sending webhook to n8n`, { headers, body });

    const response = await fetch(process.env.N8N_AGENT_WEBHOOK, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const json = await response.json();
    const result = json as {
      output: WebhookResponse;
    };
    const { output } = result;

    logger.debug(`Received webhook response`, { output });

    await message.reply({
      content: output.message
    });

    logger.debug(`Message type`, { type: output.type });

    switch (output.type) {
      case 'play':
        logger.debug(`Playing music`);
        await playMusic(context, {
          query: output.query,
          queueType: output.queueType,
          source: output.source,
          member: message.member,
          message
        });
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
    await message.reply({
      content: i18next.t('reply.not_in_voice')
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
      }
      break;
    }
    case LoadResultType.EMPTY: {
      logger.debug('Track came up empty', { retryCount });
      return;
    }
    case LoadResultType.PLAYLIST: {
      if (!result) return;

      player.queue.enqueue(...result.data.tracks);

      if (!player.queue.current) {
        await player.play();
      }
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
