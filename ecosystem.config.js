module.exports = {
  apps: [
    {
      name: 'eversoul-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '/home/rikka/EverSoulHomeWork',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NODE_OPTIONS: '--no-warnings',
        NEXT_PUBLIC_ENABLE_CONSOLE: 'true'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      combine_logs: true,
      time: true,
      min_uptime: '5s',
      max_restarts: 5,
      kill_timeout: 3000,
      listen_timeout: 10000,
      wait_ready: false
    }
  ]
};

