module.exports = {
  apps: [
    {
      name: 'midiverse-backend',
      script: './dist/main.js',
      cwd: '/var/www/midiverse-deployment/midiverse',
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
        FRONTEND_URL: 'https://www.midiverse.org',
      },
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
    {
      name: 'midiverse-frontend',
      script: 'node_modules/nuxt/bin/nuxt.mjs',
      args: 'start',
      cwd: '/var/www/midiverse-deployment/midiverse/frontend',
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: 3001,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};
