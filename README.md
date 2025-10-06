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
services:
  app:
    image: docker.io/gavenda/vivy:latest
    restart: unless-stopped
    depends_on:
      - redis
      - lavalink
      - n8n
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
      REDIS_URL: 'redis://redis:6379'
  redis:
    image: docker.io/redis:latest
    restart: unless-stopped
    volumes:
      - redis:/data
  n8n:
    image: docker.n8n.io/n8nio/n8n
    restart: unless-stopped
    environment:
      GENERIC_TIMEZONE: <YOUR_TIMEZONE>
      TZ: <YOUR_TIMEZONE>
      N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS: 'true'
      N8N_RUNNERS_ENABLED: 'true'
    volumes:
      - n8n-data:/home/node/.n8n
  lavalink:
    image: ghcr.io/lavalink-devs/lavalink:4
    restart: unless-stopped
    environment:
      SERVER_PORT: 2333
      LAVALINK_SERVER_PASSWORD: youshallnotpass
volumes:
  redis:
    driver: local
  n8n-data:
    driver: local
```
