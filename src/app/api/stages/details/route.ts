import { NextRequest, NextResponse } from 'next/server';
import { getStageDetails } from '@/utils/dataUtils';
import { DataSource } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 获取关卡详情
 * GET /api/stages/details?source=live|review&area=1&stage=1
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataSource = (searchParams.get('source') || 'live') as DataSource;
    const area = parseInt(searchParams.get('area') || '0');
    const stage = parseInt(searchParams.get('stage') || '0');

    if (!area || !stage) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必要参数: area 和 stage',
        },
        { status: 400 }
      );
    }

    console.log(`[API] 获取关卡详情: ${area}-${stage}，数据源: ${dataSource}`);
    
    const details = await getStageDetails(dataSource, area, stage);
    
    if (!details) {
      return NextResponse.json(
        {
          success: false,
          error: '关卡不存在',
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      dataSource,
      details,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600', // 浏览器缓存5分钟，CDN缓存10分钟
      }
    });
  } catch (error: any) {
    console.error('[API] 获取关卡详情失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '获取关卡详情失败',
      },
      { status: 500 }
    );
  }
}

