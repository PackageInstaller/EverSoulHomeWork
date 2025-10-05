import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DataSource } from '@/types';
import { saveCacheToFile } from '@/lib/fileCache';

// GitHub 数据获取基础 URL
const GITHUB_BASE_URL = 'https://edgeone.gh-proxy.com/raw.githubusercontent.com/PackageInstaller/DataTable/master/EverSoul/MasterData/Global';

// 需要缓存的数据文件列表
const DATA_FILES = [
  'Stage',
  'StageBattle', 
  'StringSystem',
  'StringItem',
  'StringCharacter',
  'StringCashshop',
  'StringUI',
  'Item',
  'ItemDropGroup',
  'Hero',
  'Formation',
  'CashShopItem',
  'KeyValues',
  'HeroGrade',
  'HeroLevelGrade'
];

/**
 * 从GitHub获取单个数据文件
 */
async function fetchDataFile(dataSource: DataSource, fileName: string): Promise<any> {
  const url = `${GITHUB_BASE_URL}/${dataSource}/${fileName}.json`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'EverSoul-Strategy-Web/1.0'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} - URL: ${url}`);
  }
  
  const text = await response.text();
  let data = JSON.parse(text);
  
  // 检查数据结构并标准化
  if (data && typeof data === 'object' && data.json && Array.isArray(data.json)) {
    data = data.json;
  }
  
  return data;
}

/**
 * 更新指定数据源的所有缓存（使用文件系统）
 */
async function updateCacheForDataSource(dataSource: DataSource, taskId: string): Promise<number> {
  let updatedFiles = 0;
  
  for (const fileName of DATA_FILES) {
    try {
      console.log(`📥 [FileCache] 正在获取 ${dataSource}/${fileName}...`);
      const data = await fetchDataFile(dataSource, fileName);
      
      // 保存到文件系统
      await saveCacheToFile(dataSource, fileName, data);
      
      updatedFiles++;
      console.log(`✅ [FileCache] ${dataSource}/${fileName} 缓存已更新`);
      
      // 更新任务进度
      await prisma.cacheUpdateTask.update({
        where: { id: taskId },
        data: { updatedFiles }
      });
      
    } catch (error) {
      console.error(`❌ 更新 ${dataSource}/${fileName} 失败:`, error);
      // 继续处理其他文件，不中断整个流程
    }
  }
  
  return updatedFiles;
}

/**
 * POST /api/cache/update
 * 手动触发缓存更新
 */
export async function POST(request: NextRequest) {
  try {
    const { dataSource, isManual = true } = await request.json();
    
    // 验证数据源参数
    const validDataSources = ['live', 'review', 'all'];
    if (!validDataSources.includes(dataSource)) {
      return NextResponse.json(
        { success: false, message: '无效的数据源参数' },
        { status: 400 }
      );
    }
    
    // 创建更新任务记录
    const task = await prisma.cacheUpdateTask.create({
      data: {
        taskType: isManual ? 'manual' : 'auto',
        dataSource: dataSource,
        status: 'running'
      }
    });
    
    console.log(`🚀 开始缓存更新任务: ${task.id} (${dataSource})`);
    
    try {
      let totalUpdatedFiles = 0;
      
      if (dataSource === 'all') {
        // 更新所有数据源
        totalUpdatedFiles += await updateCacheForDataSource('live', task.id);
        totalUpdatedFiles += await updateCacheForDataSource('review', task.id);
      } else {
        // 更新指定数据源
        totalUpdatedFiles = await updateCacheForDataSource(dataSource as DataSource, task.id);
      }
      
      // 标记任务完成
      await prisma.cacheUpdateTask.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          updatedFiles: totalUpdatedFiles
        }
      });
      
      console.log(`✅ 缓存更新任务完成: ${task.id}, 更新了 ${totalUpdatedFiles} 个文件`);
      
      return NextResponse.json({
        success: true,
        message: `缓存更新完成，共更新 ${totalUpdatedFiles} 个文件`,
        taskId: task.id,
        updatedFiles: totalUpdatedFiles
      });
      
    } catch (error) {
      // 标记任务失败
      await prisma.cacheUpdateTask.update({
        where: { id: task.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : '未知错误'
        }
      });
      
      throw error;
    }
    
  } catch (error) {
    console.error('缓存更新失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '缓存更新失败' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cache/update
 * 获取缓存更新状态
 */
export async function GET() {
  try {
    // 获取最近的更新任务
    const recentTasks = await prisma.cacheUpdateTask.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10
    });
    
    return NextResponse.json({
      success: true,
      recentTasks
    });
    
  } catch (error) {
    console.error('获取缓存状态失败:', error);
    return NextResponse.json(
      { success: false, message: '获取缓存状态失败' },
      { status: 500 }
    );
  }
} 