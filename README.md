<div align="center">

<a href="https://vivy.gavenda.dev" rel="noopener" target="_blank">
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

If it is your first time creating a discord bot, follow the instructions [here](https://discordjs.guide/preparations/setting-up-a-bot-application.html) and [invite](https://discordjs.guide/preparations/adding-your-bot-to-servers.html#bot-invite-links) your bot right after.

Required bot permissions should be:

- Send Messages / Send Messages in Threads
- Embed Links
- Use External Emojis
- Connect
- Speak
- Use Voice Activity

This bot uses docker to launch, simply create a docker-compose file:

```yml
version: '3'
services:
  bot:
    image: gavenda/vivy:latest
    restart: unless-stopped
    depends_on:
      - redis_cache
      - lavalink
    environment:
      TOKEN: <your bot token>
      LAVA_HOST: lavalink
      LAVA_PORT: 2333
      LAVA_PASS: youshallnotpass
      LAVA_SECURE: 'false'
      CLIENT_ID: <bot client id>
      GUILD_ID: <bot testing guild id>
      SPOTIFY_CLIENT_ID: <spotify client id>
      SPOTIFY_CLIENT_SECRET: <spotify client secret>
      REDIS_URL: 'redis://redis_cache:6379'
  redis_cache:
    image: redis:latest
    restart: unless-stopped
    volumes:
      - redis_cache:/data
  lavalink:
    image: ghcr.io/lavalink-devs/lavalink:4
    restart: unless-stopped
    environment:
      - SERVER_PORT=2333
      - LAVALINK_SERVER_PASSWORD=youshallnotpass
volumes:
  redis_cache:
    driver: local
```

## Notes

As of 1.2.0, Vivy now uses its own lavalink client, the moonlink client will still be maintained just in case. If you want to see the moonlink client code, click [here](https://github.com/gavenda/vivy/tree/moonlink).
