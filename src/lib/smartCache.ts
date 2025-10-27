/**
 * 智能缓存系统 - 支持版本检测和自动更新
 */

import { DataSource } from '@/types';

const GITHUB_BASE_URL = 'https://gh-proxy.com/raw.githubusercontent.com/PackageInstaller/DataTable/master/EverSoul/MasterData/Global';

// 缓存项接口
interface CacheItem {
  data: any;
  timestamp: number;      // 缓存时间
  etag?: string;          // 文件版本标识
  lastCheck?: number;     // 上次检查更新时间
}

// 全局缓存配置
interface SmartCacheConfig {
  cache: Map<string, CacheItem>;
  updateInterval: number;     // 检查更新间隔（毫秒）
  cacheExpiry: number;        // 缓存过期时间（毫秒）
  autoUpdate: boolean;        // 是否自动更新
  stats: {
    hits: number;
    misses: number;
    updates: number;
  };
}

// 初始化全局智能缓存
declare global {
  var __smartCache: SmartCacheConfig | undefined;
}

if (!global.__smartCache) {
  global.__smartCache = {
    cache: new Map<string, CacheItem>(),
    updateInterval: 10 * 60 * 1000,    // 默认10分钟检查一次
    cacheExpiry: 24 * 60 * 60 * 1000,  // 默认24小时过期
    autoUpdate: true,                   // 默认开启自动更新
    stats: {
      hits: 0,
      misses: 0,
      updates: 0,
    }
  };
}

const smartCache = global.__smartCache;

/**
 * 配置缓存参数
 */
export function configureCache(options: {
  updateInterval?: number;  // 检查更新间隔（分钟）
  cacheExpiry?: number;     // 缓存过期时间（小时）
  autoUpdate?: boolean;     // 是否自动更新
}) {
  if (options.updateInterval !== undefined) {
    smartCache.updateInterval = options.updateInterval * 60 * 1000;
  }
  if (options.cacheExpiry !== undefined) {
    smartCache.cacheExpiry = options.cacheExpiry * 60 * 60 * 1000;
  }
  if (options.autoUpdate !== undefined) {
    smartCache.autoUpdate = options.autoUpdate;
  }
  console.log('智能缓存配置已更新:', {
    updateInterval: `${smartCache.updateInterval / 60000}分钟`,
    cacheExpiry: `${smartCache.cacheExpiry / 3600000}小时`,
    autoUpdate: smartCache.autoUpdate,
  });
}

/**
 * 从GitHub获取JSON数据（底层获取函数）
 */
async function fetchDataFromGitHub(dataSource: DataSource, fileName: string): Promise<any> {
  const url = `${GITHUB_BASE_URL}/${dataSource}/${fileName}.json`;
  console.log(`⬇️ [开始下载] ${url}`);

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'EverSoul-Strategy-Web/1.0',
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} - URL: ${url}`);
  }

  const text = await response.text();
  let data = JSON.parse(text);

  // 检查数据结构并提取
  if (data && typeof data === 'object' && data.json && Array.isArray(data.json)) {
    data = data.json;
  }

  console.log(`✓ [下载完成] ${fileName} - ${Array.isArray(data) ? data.length + '项' : typeof data}`);
  return data;
}

/**
 * 获取缓存统计信息
 */
export function getSmartCacheStats() {
  const entries = Array.from(smartCache.cache.entries()).map(([key, item]) => {
    const [dataSource, fileName] = key.split('-');
    const age = Date.now() - item.timestamp;
    const timeSinceCheck = item.lastCheck ? Date.now() - item.lastCheck : null;

    return {
      key,
      dataSource,
      fileName,
      cacheAge: `${Math.round(age / 60000)}分钟`,
      lastCheck: timeSinceCheck ? `${Math.round(timeSinceCheck / 60000)}分钟前` : '从未',
      etag: item.etag,
      itemCount: Array.isArray(item.data) ? item.data.length : (typeof item.data === 'object' ? Object.keys(item.data).length : 1),
    };
  });

  return {
    totalEntries: smartCache.cache.size,
    cacheHits: smartCache.stats.hits,
    cacheMisses: smartCache.stats.misses,
    updates: smartCache.stats.updates,
    config: {
      updateInterval: `${smartCache.updateInterval / 60000}分钟`,
      cacheExpiry: `${smartCache.cacheExpiry / 3600000}小时`,
      autoUpdate: smartCache.autoUpdate,
    },
    entries,
  };
}

/**
 * 清除所有缓存
 */
export function clearSmartCache() {
  smartCache.cache.clear();
  smartCache.stats = { hits: 0, misses: 0, updates: 0 };
  console.log('智能缓存已清除');
}

/**
 * 手动刷新指定文件
 */
export async function refreshCache(dataSource: DataSource, fileName: string) {
  const cacheKey = `${dataSource}-${fileName}`;
  console.log(`🔄 [手动刷新] ${fileName}`);

  const data = await fetchDataFromGitHub(dataSource, fileName);

  smartCache.cache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    lastCheck: Date.now(),
  });

  console.log(`✅ [刷新完成] ${fileName}`);
  return data;
}

/**
 * 批量刷新所有缓存数据
 */
export async function refreshAllCache(dataSource: DataSource) {
  const dataFiles = [
    'Stage', 'StageBattle', 'StringSystem', 'StringItem',
    'StringCharacter', 'StringCashshop', 'StringUI', 'Item',
    'ItemDropGroup', 'Hero', 'Formation', 'CashShopItem',
    'KeyValues', 'HeroGrade', 'HeroLevelGrade'
  ];

  console.log(`🔄 [批量刷新] 开始刷新${dataFiles.length}个数据文件...`);

  for (const fileName of dataFiles) {
    try {
      await refreshCache(dataSource, fileName);
    } catch (error) {
      console.error(`刷新失败: ${fileName}`, error);
    }
  }

  console.log(`✅ [批量刷新完成]`);
}

