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

## Sharing Redis with Plana

On the server, Redis is the host's own Valkey (Arch's `valkey` package), shared by Vivy and
[Plana](https://github.com/gavenda/plana), the server's admin bot. Each bot signs in as its own user: Vivy can use
every key, and Plana keeps its cache under `plana:` and can only read Vivy's `stats:` keys. The pods reach it on the
host's loopback through pasta (`Network=pasta:-T,6379` in `vivy.pod`); Lavalink, in the same pod, is on `127.0.0.1`.
`vivy.pod` starts after `valkey-wait.service`, a user unit (`podman/valkey-wait.service`, installed to
`~/.config/systemd/user/`) that waits until Valkey answers, since a user's units can't depend on the system's
`valkey.service`.

Settings for it:

- `REDIS_URL=redis://vivy:<password>@127.0.0.1:6379`
- `LAVA_HOST=127.0.0.1`
- `TIMEZONE` (default `UTC`) is the server's time zone, where a day of stats starts. Set it to the same zone as Plana's
  `TIMEZONE` so both count the same days.

Vivy's stats keys, for anyone reading them:

| Key                                                   | Holds                                                |
| ----------------------------------------------------- | ---------------------------------------------------- |
| `stats:guild:<guild>:tracks:plays`                    | Plays per track, all time                            |
| `stats:guild:<guild>:users:requests`                  | Requests per user, all time                          |
| `stats:guild:<guild>:day:<YYYY-MM-DD>:tracks:plays`   | Plays per track that day, kept 400 days              |
| `stats:guild:<guild>:day:<YYYY-MM-DD>:users:requests` | Requests per user that day, kept 400 days            |
| `stats:guild:<guild>:day:first`                       | The first day counted by day                         |
| `stats:tracks:plays`, `stats:tracks:duration`         | Plays and milliseconds played per track, all servers |
| `stats:track:meta:<track>`                            | Title, author, uri, length, artworkUrl               |
| `stats:user:meta:<user>`                              | Username                                             |

Don't give this Redis an eviction policy (`maxmemory` with `allkeys-lru`): it would delete the stats.
