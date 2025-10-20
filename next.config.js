/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['raw.githubusercontent.com'],
  },
  
  // 生产环境配置
  productionBrowserSourceMaps: false, // 禁用浏览器端 source map
  
  // 编译器配置
  compiler: {
    // 移除 console.* 调用（生产环境）
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // 保留 error 和 warn
    } : false,
  },
  
  // Webpack 配置
  webpack: (config, { dev, isServer, webpack }) => {
    if (!dev && !isServer) {
      // 生产环境的客户端代码混淆配置
      config.optimization = {
        ...config.optimization,
        minimize: true,
        // 使用内置的 minimizer 配置
      };
      
      // 增强混淆：修改现有的 Terser 插件配置
      config.optimization.minimizer = config.optimization.minimizer.map((plugin) => {
        if (plugin.constructor.name === 'TerserPlugin') {
          // 深度合并 Terser 配置
          const newOptions = {
            ...plugin.options,
            terserOptions: {
              ...plugin.options.terserOptions,
              compress: {
                ...plugin.options.terserOptions?.compress,
                // 额外的压缩选项
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log', 'console.info', 'console.debug'],
                passes: 3, // 多次压缩
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
                // 变量名混淆
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
      
      // 添加 webpack 插件以进一步优化
      config.plugins.push(
        // 模块串联插件，可以减少模块包装代码
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