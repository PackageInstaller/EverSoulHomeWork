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
 * 检查文件是否有更新（通过HEAD请求检查ETag）
 */
async function checkFileUpdate(
  dataSource: DataSource,
  fileName: string,
  currentEtag?: string
): Promise<{ updated: boolean; newEtag?: string }> {
  try {
    const url = `${GITHUB_BASE_URL}/${dataSource}/${fileName}.json`;
    
    // 发送HEAD请求检查文件元信息
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EverSoul-Strategy-Web/1.0',
      }
    });

    if (!response.ok) {
      console.warn(`检查更新失败: ${url} - ${response.status}`);
      return { updated: false };
    }

    // 获取ETag或Last-Modified
    const newEtag = response.headers.get('etag') || 
                    response.headers.get('last-modified') || 
                    Date.now().toString();

    // 如果没有之前的ETag，认为是新数据
    if (!currentEtag) {
      return { updated: true, newEtag };
    }

    // 比较ETag判断是否更新
    const updated = newEtag !== currentEtag;
    
    if (updated) {
      console.log(`检测到更新: ${fileName} - 旧ETag: ${currentEtag}, 新ETag: ${newEtag}`);
    }

    return { updated, newEtag };
  } catch (error) {
    console.error(`检查文件更新失败: ${fileName}`, error);
    return { updated: false };
  }
}

/**
 * 获取数据（带智能更新）
 */
export async function getSmartCachedData(
  dataSource: DataSource,
  fileName: string
): Promise<any> {
  const cacheKey = `${dataSource}-${fileName}`;
  const now = Date.now();
  const cached = smartCache.cache.get(cacheKey);

  // 情况1: 缓存不存在 - 首次加载
  if (!cached) {
    console.log(`[缓存未命中] ${fileName} - 首次加载`);
    smartCache.stats.misses++;
    return await fetchAndCache(dataSource, fileName, cacheKey);
  }

  // 情况2: 缓存存在但已过期
  const cacheAge = now - cached.timestamp;
  if (cacheAge > smartCache.cacheExpiry) {
    console.log(`[缓存过期] ${fileName} - 缓存时间: ${Math.round(cacheAge / 3600000)}小时`);
    return await fetchAndCache(dataSource, fileName, cacheKey);
  }

  // 情况3: 缓存有效，检查是否需要检测更新
  const shouldCheck = smartCache.autoUpdate && (
    !cached.lastCheck || 
    (now - cached.lastCheck) > smartCache.updateInterval
  );

  if (shouldCheck) {
    console.log(`[检查更新] ${fileName} - 上次检查: ${cached.lastCheck ? Math.round((now - cached.lastCheck) / 60000) + '分钟前' : '从未'}`);
    
    // 异步检查更新（不阻塞当前请求）
    checkAndUpdate(dataSource, fileName, cacheKey, cached).catch(err => {
      console.error(`后台更新检查失败: ${fileName}`, err);
    });
  }

  // 返回现有缓存
  smartCache.stats.hits++;
  console.log(`[缓存命中] ${fileName}`);
  return cached.data;
}

/**
 * 检查并更新缓存（后台任务）
 */
async function checkAndUpdate(
  dataSource: DataSource,
  fileName: string,
  cacheKey: string,
  cached: CacheItem
): Promise<void> {
  // 更新检查时间
  cached.lastCheck = Date.now();

  // 检查文件是否有更新
  const { updated, newEtag } = await checkFileUpdate(dataSource, fileName, cached.etag);

  if (updated) {
    console.log(`🔄 [后台更新] ${fileName} - 检测到新版本，开始下载...`);
    
    try {
      const newData = await fetchDataFromGitHub(dataSource, fileName);
      
      // 更新缓存
      smartCache.cache.set(cacheKey, {
        data: newData,
        timestamp: Date.now(),
        etag: newEtag,
        lastCheck: Date.now(),
      });
      
      smartCache.stats.updates++;
      console.log(`✅ [更新完成] ${fileName} - 缓存已更新`);
    } catch (error) {
      console.error(`❌ [更新失败] ${fileName}`, error);
    }
  } else {
    console.log(`✓ [无需更新] ${fileName} - 数据未变化`);
  }
}

/**
 * 从GitHub获取数据并缓存
 */
async function fetchAndCache(
  dataSource: DataSource,
  fileName: string,
  cacheKey: string
): Promise<any> {
  const data = await fetchDataFromGitHub(dataSource, fileName);
  
  // 获取ETag（如果可能）
  const url = `${GITHUB_BASE_URL}/${dataSource}/${fileName}.json`;
  let etag: string | undefined;
  
  try {
    const headResp = await fetch(url, { method: 'HEAD' });
    etag = headResp.headers.get('etag') || headResp.headers.get('last-modified') || undefined;
  } catch {
    // 忽略HEAD请求失败
  }

  // 缓存数据
  smartCache.cache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    etag,
    lastCheck: Date.now(),
  });

  console.log(`💾 [数据已缓存] ${fileName}`);
  return data;
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

