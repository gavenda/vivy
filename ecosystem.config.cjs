module.exports = {
  apps: [
    {
      name: 'vivy',
      script: './src/app.ts',
      interpreter: 'node',
      interpreterArgs: '--import tsx'
    }
  ],
  deploy: {
    production: {
      user: process.env.APP_USER,
      host: process.env.APP_HOST,
      key: 'deploy.key',
      ref: process.env.APP_BRANCH,
      repo: 'https://github.com/gavenda/vivy',
      path: process.env.APP_PATH,
      'post-deploy':
        'pnpm install && pnpm run register && pm2 startOrRestart ecosystem.config.cjs && pm2 save',
      env: {
        APP_ENV: 'production',
        DOTENV_KEY: process.env.DOTENV_KEY
      }
    },
    development: {
      user: process.env.APP_USER,
      host: process.env.APP_HOST,
      key: 'deploy.key',
      ref: process.env.APP_BRANCH,
      repo: 'https://github.com/gavenda/vivy',
      path: process.env.APP_PATH,
      'post-deploy':
        'pnpm install && pnpm run register && pm2 startOrRestart ecosystem.config.cjs && pm2 save',
      env: {
        APP_ENV: 'development',
        DOTENV_KEY: process.env.DOTENV_KEY
      }
    }
  }
};
