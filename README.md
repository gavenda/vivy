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
  lavalink:
    image: ghcr.io/lavalink-devs/lavalink:4
    restart: unless-stopped
    environment:
      SERVER_PORT: 2333
      LAVALINK_SERVER_PASSWORD: youshallnotpass
volumes:
  redis:
    driver: local
```

## Sharing Redis with Plana

On the server, Redis is the host's own Valkey (Arch's `valkey` package), shared by Vivy and
[Plana](https://github.com/gavenda/plana), the server's admin bot. Each bot signs in as its own user: Vivy can use
every key, and Plana keeps its cache under `plana:` and can only read Vivy's `stats:` keys. The pods reach it on the
host's loopback through pasta (`Network=pasta:-T,6379` in `vivy.pod`); Lavalink, in the same pod, is on `127.0.0.1`.
`vivy.pod` starts after `valkey-wait.service`, a user unit (installed to `~/.config/systemd/user/`) that waits until
Valkey answers, since a user's units can't depend on the system's
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

### Remote control from Plana

Plana's Music page commands Vivy over pub/sub on the same Redis. `src/remote/contract.ts` defines the messages, and Plana
keeps a copy of it, so change both together.

| Channel                | Direction     | Carries                                                                                |
| ---------------------- | ------------- | -------------------------------------------------------------------------------------- |
| `vivy:remote:request`  | Plana to Vivy | Requests: search, play, pause, resume, skip, stop, clear, shuffle, remove, move, state |
| `vivy:remote:response` | Vivy to Plana | The answer to each request, matched by its id                                          |
| `vivy:remote:event`    | Vivy to Plana | A server's player state whenever it changes, and `ready`/`shutdown`                    |

Vivy listens once it is ready, unless `INTERACTIONS_ONLY` is set. Plana takes nobody receiving its request as Vivy being
offline. Valkey users start with no channels (`resetchannels`), so both need `&vivy:remote:*`, and plana the pub/sub
commands. On the server, `valkey.yml` in the playbooks grants them.

Don't give this Redis an eviction policy (`maxmemory` with `allkeys-lru`): it would delete the stats.
