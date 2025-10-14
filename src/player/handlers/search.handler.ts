import { AppEmoji } from 'vivy/emojis';
import { Player, type SearchLoadResult } from 'vivy/link';
import { logger } from 'vivy/logger';
import type { Requester } from 'vivy/requester';
import { trimEllipse } from 'vivy/utils/trim-ellipses';
import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import i18next from 'i18next';
import { handleQueueSelection } from './queue-selection.handler';
import { handleTrack } from './track.handler';
import { QueueType } from '../queue.type';

export const handleSearch = async (options: {
  query: string;
  result: SearchLoadResult<Requester>;
  interaction: ChatInputCommandInteraction;
  player: Player<Requester>;
  queueType: QueueType;
}) => {
  const { result, interaction, player, query, queueType } = options;

  const musicSelectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select:music`)
    .setMaxValues(1)
    .setMinValues(1)
    .setPlaceholder(i18next.t('placeholder.select_music', { lng: interaction.locale }));

  for (const [index, track] of result.data.entries()) {
    musicSelectMenu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(trimEllipse(track.info.title, 100))
        .setDescription(trimEllipse(track.info.author, 100))
        .setValue(track.info.identifier)
        .setEmoji(index === 0 ? AppEmoji.Preferred : AppEmoji.MusicNote)
    );
  }

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(musicSelectMenu);

  const response = await interaction.followUp({
    content: i18next.t('reply.query_search_results', { lng: interaction.locale, query }),
    components: [row]
  });

  try {
    const selectMusic = await response.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      filter: (i) => i.user.id === interaction.user.id && i.message.id === response.id,
      time: 60_000
    });
    const selectedIdentifier = selectMusic.values[0];
    const track = result.data.find((track) => track.info.identifier === selectedIdentifier);

    if (!track) {
      await interaction.editReply({
        content: i18next.t('reply.selected_track_not_found', { lng: interaction.locale }),
        components: []
      });
      return;
    }

    logger.debug('Track selected', track);

    await selectMusic.deferUpdate();

    if (player.queue.current) {
      await handleQueueSelection({ interaction: selectMusic, track, player, queueType });
    } else {
      await handleTrack({ interaction, track, player, queueType: QueueType.LATER });
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: unknown) {
    await interaction.editReply({
      content: i18next.t('reply.failed_music_selection', { lng: interaction.locale }),
      components: []
    });
    return;
  }
};
