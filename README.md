# Vivy

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
![Build](https://github.com/gavenda/vivy.js/actions/workflows/build.yml/badge.svg)


My mission is to make everyone happy by singing.

## Requirements
- Lavalink Node
- Redis Instance

## How to start

If you're forking from this repository, remove `.env.vault` and create your own `.env` using the sample given: `.env.sample`.

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
