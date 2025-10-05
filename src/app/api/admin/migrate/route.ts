import { NextRequest, NextResponse } from 'next/server';
import { 
  checkMigrationStatus, 
  applyMigrations, 
  performDatabaseHealthCheck 
} from '@/lib/migration';

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/migrate
 * 检查数据库迁移状态
 */
export async function GET() {
  try {
    const status = await checkMigrationStatus();
    
    return NextResponse.json({
      success: true,
      ...status
    });
    
  } catch (error) {
    console.error('检查迁移状态失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '检查迁移状态失败' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/migrate
 * 执行数据库迁移
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'apply') {
      // 仅应用迁移
      const result = await applyMigrations();
      return NextResponse.json(result);
      
    } else if (action === 'health-check') {
      // 完整的健康检查和自动修复
      const result = await performDatabaseHealthCheck();
      return NextResponse.json(result);
      
    } else {
      return NextResponse.json(
        { success: false, message: '无效的操作类型' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('执行迁移操作失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '迁移操作失败' 
      },
      { status: 500 }
    );
  }
} 