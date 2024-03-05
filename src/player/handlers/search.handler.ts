import { AppEmoji } from '@app/emojis';
import { logger } from '@app/logger';
import { QueueType } from '@app/player';
import { trimEllipse } from '@app/utils/trim-ellipses';
import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import { MoonlinkPlayer, SearchResult } from 'moonlink.js';
import { handleTrack } from './track.handler';

export const handleSearch = async (options: {
  result: SearchResult;
  interaction: ChatInputCommandInteraction;
  player: MoonlinkPlayer;
  queue: QueueType;
}) => {
  const { result, interaction, player, queue } = options;

  const selectMusicMenu = new StringSelectMenuBuilder()
    .setCustomId(`select:music`)
    .setPlaceholder('Please select music to play');

  for (const [index, track] of result.tracks.entries()) {
    selectMusicMenu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(trimEllipse(track.title, 100))
        .setDescription(trimEllipse(track.author, 100))
        .setValue(track.identifier)
        .setEmoji(index === 0 ? AppEmoji.Preferred : AppEmoji.MusicNote)
    );
  }

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMusicMenu);

  const response = await interaction.followUp({
    components: [row]
  });

  try {
    const selectTrack = await response.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      filter: (i) => i.user.id === interaction.user.id,
      time: 60_000
    });
    const selectedIdentifier = selectTrack.values[0];
    const selectedTrack = result.tracks.find((track) => track.identifier === selectedIdentifier);

    if (!selectedTrack) {
      await interaction.editReply({
        content: `Unable to find selected track.`,
        components: []
      });
      return;
    }

    logger.debug('Track selected', selectedTrack);

    await handleTrack({ interaction, track: selectedTrack, player, queue });
  } catch (e) {
    await interaction.editReply({
      content: 'No music selected within a minute, cancelled.',
      components: []
    });
    return;
  }
};
