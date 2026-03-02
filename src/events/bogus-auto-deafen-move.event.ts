import { ChannelType, Events, type VoiceState } from 'discord.js';
import type { AppEvent } from './event';
import type { AppContext } from 'vivy/context';
import { redis } from 'bun';

const BOGUS_GUILD_ID = `369435836627812352`;
const BOGUS_LIBRARY_CHANNEL_ID = `977746593430249483`;

export const bogusAutoDeafenMove: AppEvent<Events.VoiceStateUpdate> = {
  event: Events.VoiceStateUpdate,
  once: false,
  execute: async (context: AppContext, oldState: VoiceState, newState: VoiceState) => {
    if (!oldState.member) return;
    if (!newState.member) return;

    const member = oldState.member || newState.member;

    if (member.guild.id !== BOGUS_GUILD_ID) return;

    const voiceChannelKey = `voice-channel:${oldState.guild.id}:${oldState.member.id}`;

    // Old channel is NOT library, not deafen, proceed to deafen
    if (oldState.channelId !== BOGUS_LIBRARY_CHANNEL_ID && !oldState.deaf && newState.deaf) {
      const libVoiceChannel = await context.client.channels.fetch(BOGUS_LIBRARY_CHANNEL_ID);

      if (libVoiceChannel && libVoiceChannel.type !== ChannelType.GuildVoice) return;

      // Move to library
      await member.voice.setChannel(libVoiceChannel);
    }

    // Old Channel is Library, and deafen, proceed to undeafen
    if (oldState.channelId === BOGUS_LIBRARY_CHANNEL_ID && oldState.deaf && !newState.deaf) {
      const oldVoiceChannelId = await redis.get(voiceChannelKey);

      // Old voice channel id exists in cache, and is not library
      if (oldVoiceChannelId && oldVoiceChannelId !== BOGUS_LIBRARY_CHANNEL_ID) {
        const oldVoiceChannel = await context.client.channels.fetch(oldVoiceChannelId);

        if (oldVoiceChannel && oldVoiceChannel.type !== ChannelType.GuildVoice) return;

        // Move to previous voice channel if applicable
        await member.voice.setChannel(oldVoiceChannel);
      }
    }

    // Store previous voice channel
    await redis.set(voiceChannelKey, `${oldState.channelId}`);
  }
};
