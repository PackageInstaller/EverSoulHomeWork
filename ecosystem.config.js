module.exports = {
  apps: [
    {
      name: 'eversoul-web',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NODE_OPTIONS: '--no-warnings --no-experimental-fetch-warning',
        NEXT_PUBLIC_ENABLE_CONSOLE: 'true'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      combine_logs: true,
      time: true
    }
  ]
};

