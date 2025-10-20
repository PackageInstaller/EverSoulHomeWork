#!/usr/bin/env node

/**
 * 预加载游戏数据缓存
 * 在应用启动后自动执行，避免首次访问时等待下载
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

console.log('🚀 开始预加载游戏数据缓存...');

// 等待服务器启动
function waitForServer(retries = 30, delay = 2000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const checkServer = () => {
      attempts++;
      console.log(`[${attempts}/${retries}] 检查服务器是否就绪...`);
      
      const req = http.get(`http://${HOST}:${PORT}/`, (res) => {
        if (res.statusCode === 200) {
          console.log('✅ 服务器已就绪');
          resolve();
        } else {
          if (attempts < retries) {
            setTimeout(checkServer, delay);
          } else {
            reject(new Error('服务器启动超时'));
          }
        }
      });
      
      req.on('error', (err) => {
        if (attempts < retries) {
          setTimeout(checkServer, delay);
        } else {
          reject(err);
        }
      });
      
      req.end();
    };
    
    checkServer();
  });
}

// 预加载数据
async function preloadData() {
  try {
    console.log('📥 正在预加载 live 和 review 数据源...');
    
    const dataSources = ['live', 'review'];
    
    for (const source of dataSources) {
      const startTime = Date.now();
      
      const options = {
        hostname: HOST,
        port: PORT,
        path: `/api/stages/list?source=${source}`,
        method: 'GET',
        timeout: 120000 // 2分钟超时
      };
      
      await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            
            if (res.statusCode === 200) {
              try {
                const result = JSON.parse(data);
                if (result.success) {
                  console.log(`✅ [${source}] 数据预加载完成 (${result.count} 个关卡, 用时 ${duration}s)`);
                  resolve();
                } else {
                  console.error(`❌ [${source}] 预加载失败: ${result.error}`);
                  reject(new Error(result.error));
                }
              } catch (err) {
                console.error(`❌ [${source}] 解析响应失败:`, err.message);
                reject(err);
              }
            } else {
              console.error(`❌ [${source}] HTTP ${res.statusCode}`);
              reject(new Error(`HTTP ${res.statusCode}`));
            }
          });
        });
        
        req.on('error', (err) => {
          console.error(`❌ [${source}] 请求失败:`, err.message);
          reject(err);
        });
        
        req.on('timeout', () => {
          console.error(`❌ [${source}] 请求超时`);
          req.destroy();
          reject(new Error('请求超时'));
        });
        
        req.end();
      });
    }
    
    console.log('🎉 所有数据预加载完成！');
    console.log('💡 用户首次访问时将直接使用缓存数据，无需等待');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 预加载失败:', error.message);
    console.error('⚠️  用户首次访问时将需要等待数据下载');
    process.exit(1);
  }
}

// 主流程
async function main() {
  try {
    console.log(`正在连接到 http://${HOST}:${PORT}`);
    await waitForServer();
    
    // 等待额外2秒确保应用完全启动
    console.log('⏳ 等待应用完全启动...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await preloadData();
  } catch (error) {
    console.error('❌ 预加载脚本执行失败:', error.message);
    process.exit(1);
  }
}

main();

