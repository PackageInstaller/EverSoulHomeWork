/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['raw.githubusercontent.com'],
  },
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  webpack: (config, { dev, isServer, webpack }) => {
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
      };
      config.optimization.minimizer = config.optimization.minimizer.map((plugin) => {
        if (plugin.constructor.name === 'TerserPlugin') {
          const newOptions = {
            ...plugin.options,
            terserOptions: {
              ...plugin.options.terserOptions,
              compress: {
                ...plugin.options.terserOptions?.compress,
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info', 'console.debug'],
                passes: 3,
                dead_code: true,
                conditionals: true,
                evaluate: true,
                booleans: true,
                loops: true,
                unused: true,
                hoist_funs: true,
                if_return: true,
                join_vars: true,
                side_effects: true,
              },
              mangle: {
                ...plugin.options.terserOptions?.mangle,
                toplevel: true,
                eval: true,
                keep_classnames: false,
                keep_fnames: false,
                safari10: true,
              },
              format: {
                ...plugin.options.terserOptions?.format,
                comments: false,
                ascii_only: true,
              },
            },
            extractComments: false,
          };
          
          plugin.options = newOptions;
        }
        return plugin;
      });
      config.plugins.push(
        new webpack.optimize.ModuleConcatenationPlugin()
      );
    }
    
    return config;
  },
  
  // 实验性功能
  experimental: {
    // 优化包导入
    optimizePackageImports: ['@prisma/client'],
  },
}

module.exports = nextConfig 