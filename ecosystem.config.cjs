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
      ref: 'origin/main',
      repo: 'https://github.com/gavenda/vivy',
      path: process.env.APP_PATH,
      'post-deploy': 'pnpm install && pm2 reload ecosystem.config.js && pm2 save'
    }
  }
};
