declare namespace NodeJS {
  interface ProcessEnv {
    TOKEN: string;
    CLIENT_ID: string;
    GUILD_ID: string;
    REDIS_URL: string;
    SPOTIFY_CLIENT_ID: string;
    SPOTIFY_CLIENT_SECRET: string;
    LAVA_HOST: string;
    LAVA_SECURE: string;
    LAVA_PASS: string;
    LAVA_PORT: string;
  }
}
