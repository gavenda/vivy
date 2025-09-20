import {
  ButtonBuilder,
  ButtonStyle,
  Locale,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder
} from 'discord.js';
import type { AppCommand } from './command';
import { version } from '@app/version';
import i18next from 'i18next';

export const about: AppCommand = {
  // prettier-ignore
  data: new SlashCommandBuilder()
    .setName('about')
    .setDescription('What Vivy is all about.')
    .toJSON(),
  execute: async (context, interaction) => {
    const { client } = context;

    if (!client.user) {
      await interaction.reply(`Unable to fetch self information. Please contact the creator.`);
      return;
    }

    let lng = Locale.EnglishUS;

    if (interaction.guild) {
      lng = interaction.guild.preferredLocale;
    }

    const dateCreated = client.user.createdAt;
    const selfAvatarUrl = client.user.avatarURL()!;

    const aboutSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${i18next.t('about_embed.title', { lng })}`),
        new TextDisplayBuilder().setContent(i18next.t('about_embed.description', { lng }))
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(selfAvatarUrl));
    const seperator = new SeparatorBuilder();

    const sourceSection = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(i18next.t('about_embed.footer', { lng })))
      .setButtonAccessory(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(`GitHub`).setURL(`https://github.com/gavenda/vivy`)
      );

    let detailedText = `-# ${i18next.t('about_embed.field_version', { lng })}\n${version}\n`;
    detailedText += `-# ${i18next.t('about_embed.field_language', { lng })}\n[TypeScript](https://typescriptlang.org/)\n`;
    detailedText += `-# ${i18next.t('about_embed.field_platform', { lng })}\n[DigitalOcean](https://www.digitalocean.com/)\n`;
    detailedText += `-# ${i18next.t('about_embed.field_date_created', { lng })}\n${Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'long' }).format(dateCreated)}\n`;

    const detailedTextDisplay = new TextDisplayBuilder().setContent(detailedText);

    await interaction.reply({
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      components: [aboutSection, detailedTextDisplay, seperator, sourceSection]
    });
  }
};
