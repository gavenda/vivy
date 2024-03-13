<div align="center">

<a href="https://vivy.gavenda.dev">
  <img width="550" src="https://vivy.gavenda.dev/vivy.png">
</a>

![GitHub package.json version](https://img.shields.io/github/package-json/v/gavenda/vivy?style=for-the-badge)
![GitHub License](https://img.shields.io/github/license/gavenda/vivy?style=for-the-badge)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/gavenda/vivy/deploy.yml?style=for-the-badge)

My mission is to make everyone happy by singing.

</div>

## Requirements

- Lavalink Node
- Redis Instance

## How to start

If you're forking from this repository, remove `.env.vault` and create your own `.env` using the sample given: `.env.sample`.

You can ignore `APP_USER`, `APP_HOST`, `APP_HOST`, `APP_PATH`, and `APP_BRANCH` unless you're planning to setting up your own CI workflow for your bot.

If it is your first time creating a discord bot, follow the instructions [here](https://discordjs.guide/preparations/setting-up-a-bot-application.html) and [invite](https://discordjs.guide/preparations/adding-your-bot-to-servers.html#bot-invite-links) your bot right after.

Required bot permissions should be:

- Send Messages / Send Messages in Threads
- Embed Links
- Use External Emojis
- Connect
- Speak
- Use Voice Activity

Then simply install packages and call start:

```bash
pnpm install
pnpm start
```

or if you're using npm:

```bash
npm install
npm start
```

## Environment

Environment variables are encrypted and decrypted using [@dotenvx/dotenvx](https://github.com/dotenvx/dotenvx).

If you would like to encrypt your own `.env` after modifying it, simply call:

```bash
pnpx @dotenvx/dotenvx encrypt
```

## Notes

You are currently viewing the [moonlink.js](https://github.com/Ecliptia/moonlink.js) branch of this application.
