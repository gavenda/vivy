import { AppEmoji } from '@app/emojis';
import { logger } from '@app/logger';
import { trimEllipse } from '@app/utils/trim-ellipses';
import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import i18next from 'i18next';
import { MoonlinkPlayer, SearchResult } from 'moonlink.js';
import { handleQueueSelection } from './queue-selection.handler';
import { handleTrack } from './track.handler';

export const handleSearch = async (options: {
  query: string;
  result: SearchResult;
  interaction: ChatInputCommandInteraction;
  player: MoonlinkPlayer;
}) => {
  const { result, interaction, player, query } = options;

  const musicSelectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select:music`)
    .setMaxValues(1)
    .setMinValues(1)
    .setPlaceholder(i18next.t('placeholder.select_music', { lng: interaction.locale }));

  for (const [index, track] of result.tracks.entries()) {
    musicSelectMenu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(trimEllipse(track.title, 100))
        .setDescription(trimEllipse(track.author, 100))
        .setValue(track.identifier)
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
    const track = result.tracks.find((track) => track.identifier === selectedIdentifier);

    if (!track) {
      await interaction.editReply({
        content: i18next.t('reply.selected_track_not_found', { lng: interaction.locale }),
        components: []
      });
      return;
    }

    logger.debug('Track selected', track);

    await selectMusic.deferUpdate();

    if (player.current) {
      await handleQueueSelection({ interaction: selectMusic, track, player });
    } else {
      await handleTrack({ interaction, track, player, queue: 'later' });
    }
  } catch (e) {
    await interaction.editReply({
      content: i18next.t('reply.failed_music_selection', { lng: interaction.locale }),
      components: []
    });
    return;
  }
};
