import { RepeatMode } from 'vivy/link';
import { RadioType } from 'vivy/listen.moe';

import { createPlayerEmbed, getPlayerPage, playRadio, QUEUE_PAGE_SIZE, setPlayerPage } from 'vivy/player';
import { chunkSize } from 'vivy/utils';
import { Events, MessageFlags } from 'discord.js';
import i18next from 'i18next';
import type { AppEvent } from './event';
import { getLogger } from '@logtape/logtape';
import { fetchLyricsComponents } from 'vivy/utils/fetch-lyrics';

const logger = getLogger(['vivy', 'event:player-button']);

export const buttonInteraction: AppEvent<Events.InteractionCreate> = {
  event: Events.InteractionCreate,
  once: false,
  execute: async (context, interaction) => {
    if (interaction.applicationId != context.applicationId) return;
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('player')) return;
    if (!interaction.guild || !interaction.guildId || !interaction.inGuild()) {
      await interaction.reply({
        content: i18next.t('reply.not_in_guild', { lng: interaction.locale }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    const { link } = context;
    const player = link.findPlayerByGuildId(interaction.guild.id);

    if (!player) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: i18next.t('reply.not_playing', { lng: interaction.locale })
      });
      return;
    }

    const [, buttonId] = interaction.customId.split(':');
    const volume = player.volume;

    logger.debug('Received player button interaction', { buttonId });

    const pageSize = chunkSize(player.queue.size, QUEUE_PAGE_SIZE);
    // The queue may have shrunk since the page was stored
    let pageIndex = Math.min(await getPlayerPage(player.guildId), pageSize - 1);

    switch (buttonId) {
      case 'play-toggle': {
        if (player.playing) {
          await player.pause();
        } else {
          await player.resume();
        }
        break;
      }
      case 'skip': {
        await player.skip();
        break;
      }
      case 'shuffle': {
        player.queue.shuffle();
        break;
      }
      case 'volume-down': {
        await player.applyVolume(Math.min(1, Math.max(0, volume - 0.1)));
        break;
      }
      case 'volume-up': {
        await player.applyVolume(Math.min(1, Math.max(0, volume + 0.1)));
        break;
      }
      case 'repeat-track': {
        player.repeatMode = player.repeatMode === RepeatMode.TRACK ? RepeatMode.OFF : RepeatMode.TRACK;
        break;
      }
      case 'repeat-queue': {
        player.repeatMode = player.repeatMode === RepeatMode.QUEUE ? RepeatMode.OFF : RepeatMode.QUEUE;
        break;
      }
      case 'stop': {
        await player.queue.clear();
        await player.stop();
        break;
      }
      case 'previous': {
        pageIndex--;

        if (pageIndex < 0) {
          pageIndex = pageSize - 1;
        }
        break;
      }
      case 'next': {
        pageIndex++;

        if (pageIndex >= pageSize) {
          pageIndex = 0;
        }
        break;
      }
      case 'kpop':
      case 'jpop': {
        // Fetching the stream can take a while, and the embed is refreshed once the stream has started
        await interaction.deferUpdate();

        const played =
          player.voiceConnected &&
          (await playRadio(context, player, buttonId === 'kpop' ? RadioType.KPOP : RadioType.JPOP, {
            userId: interaction.user.id,
            userName: interaction.user.username,
            textChannelId: interaction.channelId
          }));

        if (!played) {
          await interaction.followUp({
            flags: MessageFlags.Ephemeral,
            content: i18next.t('reply.error_radio', { lng: interaction.locale })
          });
        }

        return;
      }
      case 'lyrics': {
        if (!player.queue.current) {
          break;
        }

        const container = await fetchLyricsComponents(player.queue.current);

        await interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container]
        });

        // Already answered, updating the embed as well would be a second response
        return;
      }
    }

    const container = createPlayerEmbed(context, interaction.guildId, pageIndex);
    await setPlayerPage(player.guildId, pageIndex);
    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [container]
    });
  }
};
