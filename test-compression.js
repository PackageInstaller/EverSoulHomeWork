/**
 * 测试Gzip压缩功能
 */

const { saveCacheToFile, loadCacheFromFile, getCacheStats } = require('./src/lib/fileCache.ts');

async function testCompression() {
  console.log('🧪 开始测试压缩功能...\n');

  // 测试数据
  const testData = {
    json: Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `测试对象${i}`,
      description: '这是一个测试对象，用于验证gzip压缩功能是否正常工作。'.repeat(5),
      value: Math.random() * 1000,
      tags: ['test', 'compression', 'gzip', 'performance']
    }))
  };

  const jsonString = JSON.stringify(testData);
  const originalSize = Buffer.byteLength(jsonString, 'utf8');
  console.log(`📊 测试数据大小: ${(originalSize / 1024).toFixed(2)} KB\n`);

  try {
    // 1. 测试保存
    console.log('💾 测试保存压缩...');
    await saveCacheToFile('test', 'CompressionTest', testData);
    
    // 2. 测试读取
    console.log('\n📖 测试读取解压...');
    const loadedData = await loadCacheFromFile('test', 'CompressionTest');
    
    if (!loadedData) {
      console.error('❌ 读取失败！');
      return;
    }

    // 3. 验证数据完整性
    console.log('\n🔍 验证数据完整性...');
    if (JSON.stringify(loadedData) === JSON.stringify(testData)) {
      console.log('✅ 数据完整，压缩/解压成功！');
    } else {
      console.error('❌ 数据不一致！');
      return;
    }

    // 4. 获取统计
    console.log('\n📊 缓存统计:');
    const stats = await getCacheStats();
    console.log(`  总文件数: ${stats.totalFiles}`);
    console.log(`  原始大小: ${(stats.totalSize / 1024).toFixed(2)} KB`);
    console.log(`  压缩大小: ${(stats.totalCompressedSize / 1024).toFixed(2)} KB`);
    
    const ratio = stats.totalSize > 0 
      ? ((1 - stats.totalCompressedSize / stats.totalSize) * 100).toFixed(1)
      : '0';
    console.log(`  压缩比例: ${ratio}%`);

    console.log('\n✅ 所有测试通过！');
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  }
}

// 注意：由于TypeScript模块，需要使用构建后的版本
console.log('⚠️  此脚本需要在构建后运行，或直接在管理后台测试');
console.log('建议：部署后访问管理后台 → 更新缓存 → 查看日志验证压缩效果');
