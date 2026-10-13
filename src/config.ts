const required = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
};

export const loadConfig = () => ({
  token: required('TOKEN'),
  clientId: required('CLIENT_ID'),
  guildId: required('GUILD_ID'),
  redisUrl: required('REDIS_URL'),
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
