import { NextRequest, NextResponse } from 'next/server';
import { getStageDetails } from '@/utils/dataUtils';
import { DataSource } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * 批量获取关卡信息（主要是teamCount）
 * GET /api/stages/batch-info?source=Live|Review&stageIds=1-1,1-2,1-3
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataSource = (searchParams.get('source') || 'Live') as DataSource;
    const stageIdsParam = searchParams.get('stageIds');
    
    // 添加时间戳参数以防止CDN缓存
    const timestamp = searchParams.get('_t');

    if (!stageIdsParam) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少必要参数: stageIds',
        },
        { status: 400 }
      );
    }

    const stageIds = stageIdsParam.split(',').map(id => id.trim());
    const results: Record<string, { teamCount: number; stageId: string }> = {};

    // 批量获取关卡详情
    for (const stageId of stageIds) {
      const [areaStr, stageStr] = stageId.split('-');
      const area = parseInt(areaStr);
      const stage = parseInt(stageStr);

      if (!area || !stage) {
        continue;
      }

      try {
        const details = await getStageDetails(dataSource, area, stage);
        if (details && details.battle_teams && details.battle_teams.length > 0) {
          results[stageId] = {
            stageId,
            teamCount: details.battle_teams.length,
          };
        } else {
          // 如果没有战斗信息，默认为1队
          results[stageId] = {
            stageId,
            teamCount: 1,
          };
        }
      } catch (error) {
        console.error(`获取关卡 ${stageId} 信息失败:`, error);
        // 失败时默认为1队
        results[stageId] = {
          stageId,
          teamCount: 1,
        };
      }
    }

    return NextResponse.json({
      success: true,
      dataSource,
      results,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: any) {
    console.error('[API] 批量获取关卡信息失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '批量获取关卡信息失败',
      },
      { status: 500 }
    );
  }
}

