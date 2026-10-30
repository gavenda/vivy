export const required = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
};

/**
 * The zone a day of stats starts in, UTC when unset. Readers of the daily stats, such as Plana, must use
 * the same zone, so a typo fails startup instead of silently counting days in the wrong one.
 */
export const statsTimeZone = (): string => {
  const timeZone = process.env.STATS_TIMEZONE || 'UTC';

  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
  } catch {
    throw new Error(`STATS_TIMEZONE must be an IANA time zone such as Europe/Dublin, got ${timeZone}.`);
  }

  return timeZone;
};

export const loadConfig = () => ({
  token: required('TOKEN'),
  clientId: required('CLIENT_ID'),
  guildId: required('GUILD_ID'),
  // The shared redis client reads it when first used, requiring it here fails startup early instead
  redisUrl: required('REDIS_URL'),
  statsTimeZone: statsTimeZone(),
  spotify: {
    clientId: required('SPOTIFY_CLIENT_ID'),
    clientSecret: required('SPOTIFY_CLIENT_SECRET')
  },
  lavalink: {
    host: required('LAVA_HOST'),
    port: Number(required('LAVA_PORT')),
    secure: required('LAVA_SECURE') === 'true',
    password: required('LAVA_PASS')
  }
});

export type Config = ReturnType<typeof loadConfig>;
