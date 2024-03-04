const deploymentConfig = (environment) => {
  return {
    user: process.env.APP_USER,
    host: process.env.APP_HOST,
    key: 'deploy.key',
    ref: process.env.APP_BRANCH,
    repo: 'https://github.com/gavenda/vivy',
    path: process.env.APP_PATH,
    // prettier-ignore
    'post-deploy': 'pnpm install && pnpm run register && pm2 startOrRestart ecosystem.config.cjs && pm2 save',
    env: {
      APP_ENV: environment,
      DOTENV_KEY: process.env.DOTENV_KEY
    }
  };
};

module.exports = {
  apps: [
    {
      name: 'vivy',
      script: './src/app.ts',
      interpreter: 'node',
      interpreterArgs: '--import tsx/esm',
      wait_ready: true
    }
  ],
  deploy: {
    production: deploymentConfig('production'),
    development: deploymentConfig('development')
  }
};
