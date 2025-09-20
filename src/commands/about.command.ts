import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
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

    const container = new ContainerBuilder();

    const aboutSection = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${i18next.t('about_embed.title', { lng })}`),
        new TextDisplayBuilder().setContent(i18next.t('about_embed.description', { lng }))
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(selfAvatarUrl));

    const sourceSection = new SectionBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(i18next.t('about_embed.footer', { lng })))
      .setButtonAccessory(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(`GitHub`).setURL(`https://github.com/gavenda/vivy`)
      );

    const versionText = `-# ${i18next.t('about_embed.field_version', { lng })}\n${version}\n`;
    const languageText = `-# ${i18next.t('about_embed.field_language', { lng })}\n[TypeScript](https://typescriptlang.org/)\n`;
    const platformText = `-# ${i18next.t('about_embed.field_platform', { lng })}\n[DigitalOcean](https://www.digitalocean.com/)\n`;
    const dateCreatedText = `-# ${i18next.t('about_embed.field_date_created', { lng })}\n${Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'long' }).format(dateCreated)}\n`;

    container.addSectionComponents(aboutSection);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(versionText),
      new TextDisplayBuilder().setContent(languageText),
      new TextDisplayBuilder().setContent(platformText),
      new TextDisplayBuilder().setContent(dateCreatedText)
    );
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addSectionComponents(sourceSection);

    await interaction.reply({
      flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      components: [container]
    });
  }
};
