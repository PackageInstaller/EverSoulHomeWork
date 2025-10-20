import { NextRequest, NextResponse } from 'next/server';
import { getStageList } from '@/utils/dataUtils';
import { DataSource } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 获取关卡列表
 * GET /api/stages/list?source=live|review
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataSource = (searchParams.get('source') || 'live') as DataSource;

    console.log(`[API] 获取关卡列表，数据源: ${dataSource}`);
    
    const stages = await getStageList(dataSource);
    
    return NextResponse.json({
      success: true,
      dataSource,
      stages,
      count: stages.length,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600', // 浏览器缓存5分钟，CDN缓存10分钟
      }
    });
  } catch (error: any) {
    console.error('[API] 获取关卡列表失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '获取关卡列表失败',
      },
      { status: 500 }
    );
  }
}

