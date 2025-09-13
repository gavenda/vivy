import { EmbedBuilder, Locale, MessageFlags, SlashCommandBuilder } from 'discord.js';
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
    const selfAvatarUrl = client.user.avatarURL();

    const aboutEmbed = new EmbedBuilder()
      .setTitle(i18next.t('about_embed.title', { lng }))
      .setURL(`https://vivy.gavenda.dev`)
      .setDescription(i18next.t('about_embed.description', { lng }))
      .setThumbnail(selfAvatarUrl)
      .addFields(
        {
          name: i18next.t('about_embed.field_version', { lng }),
          value: version,
          inline: true
        },
        {
          name: i18next.t('about_embed.field_language', { lng }),
          value: '[TypeScript](https://typescriptlang.org/)',
          inline: true
        },
        {
          name: i18next.t('about_embed.field_platform', { lng }),
          value: '[DigitalOcean](https://www.digitalocean.com/)',
          inline: true
        },
        {
          name: i18next.t('about_embed.field_source', { lng }),
          value: '[Source](https://github.com/gavenda/vivy)',
          inline: true
        },
        {
          name: i18next.t('about_embed.field_date_created', { lng }),
          value: Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'long' }).format(dateCreated)
        }
      )
      .setFooter({
        text: i18next.t('about_embed.footer', { lng }),
        iconURL: `https://github.com/fluidicon.png`
      });

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [aboutEmbed]
    });
  }
};
