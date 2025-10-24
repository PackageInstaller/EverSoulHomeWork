module.exports = {
  apps: [
    {
      name: 'eversoul-web',
      script: './node_modules/.bin/next',
      args: 'start',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
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
      time: true,
      min_uptime: '10s',
      max_restarts: 10,
      kill_timeout: 5000
    }
  ]
};

