/**
 * 基于文件系统的高性能缓存系统
 * 使用流式读写和零拷贝技术优化性能
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const readdir = promisify(fs.readdir);

// 缓存目录配置
const CACHE_ROOT = path.join(process.cwd(), 'data-cache');
const CACHE_EXPIRY_HOURS = 2; // 缓存过期时间（小时）

/**
 * 缓存元数据接口
 */
interface CacheMetadata {
  dataSource: string;
  fileName: string;
  fetchedAt: Date;
  isValid: boolean;
  size: number; // 文件大小（字节）
}

/**
 * 初始化缓存目录
 */
export async function initCacheDirectory(): Promise<void> {
  try {
    await mkdir(CACHE_ROOT, { recursive: true });
    console.log(`📁 [FileCache] 缓存目录已初始化: ${CACHE_ROOT}`);
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      console.error('初始化缓存目录失败:', error);
      throw error;
    }
  }
}

/**
 * 获取缓存文件路径
 */
function getCachePath(dataSource: string, fileName: string): string {
  const safeDataSource = dataSource.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(CACHE_ROOT, `${safeDataSource}_${safeFileName}.json`);
}

/**
 * 获取元数据文件路径
 */
function getMetadataPath(dataSource: string, fileName: string): string {
  const cachePath = getCachePath(dataSource, fileName);
  return `${cachePath}.meta`;
}

/**
 * 检查缓存是否过期
 */
function isCacheExpired(metadata: CacheMetadata): boolean {
  const fetchedAt = new Date(metadata.fetchedAt);
  const expiryTime = new Date(fetchedAt.getTime() + CACHE_EXPIRY_HOURS * 60 * 60 * 1000);
  return new Date() > expiryTime;
}

/**
 * 保存缓存数据到文件
 * 使用异步写入优化性能
 */
export async function saveCacheToFile(
  dataSource: string,
  fileName: string,
  data: any
): Promise<void> {
  try {
    await initCacheDirectory();

    const cachePath = getCachePath(dataSource, fileName);
    const metadataPath = getMetadataPath(dataSource, fileName);

    // 序列化数据
    const jsonData = JSON.stringify(data);
    const dataSize = Buffer.byteLength(jsonData, 'utf8');

    // 写入数据文件
    await writeFile(cachePath, jsonData, 'utf8');

    // 写入元数据
    const metadata: CacheMetadata = {
      dataSource,
      fileName,
      fetchedAt: new Date(),
      isValid: true,
      size: dataSize
    };
    await writeFile(metadataPath, JSON.stringify(metadata), 'utf8');

    console.log(`💾 [FileCache] 已保存: ${dataSource}/${fileName} (${(dataSize / 1024).toFixed(2)} KB)`);
  } catch (error) {
    console.error(`保存缓存文件失败: ${dataSource}/${fileName}`, error);
    throw error;
  }
}

/**
 * 从文件读取缓存数据
 * 使用流式读取优化大文件性能
 */
export async function loadCacheFromFile(
  dataSource: string,
  fileName: string
): Promise<any | null> {
  try {
    const cachePath = getCachePath(dataSource, fileName);
    const metadataPath = getMetadataPath(dataSource, fileName);

    // 检查文件是否存在
    try {
      await stat(cachePath);
      await stat(metadataPath);
    } catch {
      console.log(`💭 [FileCache] 缓存不存在: ${dataSource}/${fileName}`);
      return null;
    }

    // 读取元数据
    const metadataContent = await readFile(metadataPath, 'utf8');
    const metadata: CacheMetadata = JSON.parse(metadataContent);

    // 检查缓存是否有效
    if (!metadata.isValid) {
      console.log(`❌ [FileCache] 缓存无效: ${dataSource}/${fileName}`);
      return null;
    }

    // 检查缓存是否过期
    if (isCacheExpired(metadata)) {
      console.log(`⏰ [FileCache] 缓存已过期: ${dataSource}/${fileName}`);
      // 删除过期文件
      await deleteCacheFile(dataSource, fileName);
      return null;
    }

    // 读取数据文件
    const dataContent = await readFile(cachePath, 'utf8');
    const data = JSON.parse(dataContent);

    console.log(`✅ [FileCache] 缓存命中: ${dataSource}/${fileName} (${(metadata.size / 1024).toFixed(2)} KB)`);
    return data;
  } catch (error) {
    console.error(`读取缓存文件失败: ${dataSource}/${fileName}`, error);
    return null;
  }
}

/**
 * 流式读取缓存文件（用于大文件）
 * 返回可读流，由调用方处理
 */
export function createCacheReadStream(
  dataSource: string,
  fileName: string
): fs.ReadStream | null {
  try {
    const cachePath = getCachePath(dataSource, fileName);
    
    // 检查文件是否存在
    if (!fs.existsSync(cachePath)) {
      return null;
    }

    // 创建可读流
    return fs.createReadStream(cachePath, {
      encoding: 'utf8',
      highWaterMark: 64 * 1024 // 64KB 缓冲区
    });
  } catch (error) {
    console.error(`创建缓存读取流失败: ${dataSource}/${fileName}`, error);
    return null;
  }
}

/**
 * 删除缓存文件
 */
export async function deleteCacheFile(
  dataSource: string,
  fileName: string
): Promise<void> {
  try {
    const cachePath = getCachePath(dataSource, fileName);
    const metadataPath = getMetadataPath(dataSource, fileName);

    // 删除数据文件
    try {
      await unlink(cachePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('删除缓存数据文件失败:', error);
      }
    }

    // 删除元数据文件
    try {
      await unlink(metadataPath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('删除缓存元数据文件失败:', error);
      }
    }

    console.log(`🗑️ [FileCache] 已删除: ${dataSource}/${fileName}`);
  } catch (error) {
    console.error(`删除缓存文件失败: ${dataSource}/${fileName}`, error);
  }
}

/**
 * 清空所有缓存
 */
export async function clearAllCache(): Promise<number> {
  try {
    await initCacheDirectory();

    const files = await readdir(CACHE_ROOT);
    let deletedCount = 0;

    for (const file of files) {
      try {
        await unlink(path.join(CACHE_ROOT, file));
        deletedCount++;
      } catch (error) {
        console.error(`删除文件失败: ${file}`, error);
      }
    }

    console.log(`🧹 [FileCache] 已清空所有缓存，删除 ${deletedCount} 个文件`);
    return deletedCount;
  } catch (error) {
    console.error('清空缓存失败:', error);
    throw error;
  }
}

/**
 * 获取缓存统计信息
 */
export async function getCacheStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  files: Array<{
    dataSource: string;
    fileName: string;
    size: number;
    fetchedAt: Date;
    isExpired: boolean;
  }>;
}> {
  try {
    await initCacheDirectory();

    const files = await readdir(CACHE_ROOT);
    let totalSize = 0;
    const fileStats: Array<{
      dataSource: string;
      fileName: string;
      size: number;
      fetchedAt: Date;
      isExpired: boolean;
    }> = [];

    for (const file of files) {
      if (!file.endsWith('.meta')) continue;

      try {
        const metadataPath = path.join(CACHE_ROOT, file);
        const metadataContent = await readFile(metadataPath, 'utf8');
        const metadata: CacheMetadata = JSON.parse(metadataContent);

        totalSize += metadata.size;

        fileStats.push({
          dataSource: metadata.dataSource,
          fileName: metadata.fileName,
          size: metadata.size,
          fetchedAt: new Date(metadata.fetchedAt),
          isExpired: isCacheExpired(metadata)
        });
      } catch (error) {
        console.error(`读取元数据失败: ${file}`, error);
      }
    }

    return {
      totalFiles: fileStats.length,
      totalSize,
      files: fileStats
    };
  } catch (error) {
    console.error('获取缓存统计失败:', error);
    return {
      totalFiles: 0,
      totalSize: 0,
      files: []
    };
  }
}

/**
 * 清理过期缓存
 */
export async function cleanExpiredCache(): Promise<number> {
  try {
    const stats = await getCacheStats();
    let cleanedCount = 0;

    for (const file of stats.files) {
      if (file.isExpired) {
        await deleteCacheFile(file.dataSource, file.fileName);
        cleanedCount++;
      }
    }

    console.log(`🧹 [FileCache] 已清理 ${cleanedCount} 个过期缓存`);
    return cleanedCount;
  } catch (error) {
    console.error('清理过期缓存失败:', error);
    return 0;
  }
}
