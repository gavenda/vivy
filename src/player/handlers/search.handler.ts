import { AppEmoji } from '@app/emojis';
import { Player, SearchLoadResult } from '@app/link';
import { logger } from '@app/logger';
import { Requester } from '@app/requester';
import { trimEllipse } from '@app/utils/trim-ellipses';
import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import { handleQueueSelection } from './queue-selection.handler';
import { handleTrack } from './track.handler';

export const handleSearch = async (options: {
  query: string;
  result: SearchLoadResult<Requester>;
  interaction: ChatInputCommandInteraction;
  player: Player<Requester>;
}) => {
  const { result, interaction, player, query } = options;

  const musicSelectMenu = new StringSelectMenuBuilder()
    .setCustomId(`select:music`)
    .setMaxValues(1)
    .setMinValues(1)
    .setPlaceholder('Please select music to play');

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
    content: `Search results for \`${query}\``,
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
        content: `Unable to find selected track.`,
        components: []
      });
      return;
    }

    logger.debug('Track selected', track);

    await selectMusic.deferUpdate();

    if (player.queue.current) {
      await handleQueueSelection({ interaction: selectMusic, track, player });
    } else {
      await handleTrack({ interaction, track, player, queue: 'later' });
    }
  } catch (e) {
    await interaction.editReply({
      content: 'No music selected within a minute, cancelled.',
      components: []
    });
    return;
  }
};
