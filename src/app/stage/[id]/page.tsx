'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getConsistentMainStoryBackground, getBackgroundStyle } from '@/utils/backgroundUtils';
import { StageDetails as StageDetailsType, DataSource } from '@/types';
import StageDetails from '@/components/StageDetails';
import StageNavigator from '@/components/StageNavigator';

export default function StageDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [stageDetails, setStageDetails] = useState<StageDetailsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string>('');

  // 从 URL 参数解析关卡信息
  const stageId = params.id as string;
  const dataSource = (searchParams.get('source') || 'live') as DataSource;
  const returnSource = searchParams.get('returnSource') || dataSource; // 返回时使用的数据源

  const [areaNo, stageNo] = stageId.split('-').map(Number);

  useEffect(() => {
    if (areaNo && stageNo) {
      loadStageDetails();
      // 为每个关卡设置一致的背景图片
      setBackgroundImage(getConsistentMainStoryBackground(stageId));
    }
  }, [areaNo, stageNo, dataSource, stageId]);

  const loadStageDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // 通过 API 获取关卡详情（使用服务器缓存）
      const response = await fetch(
        `/api/stages/details?source=${dataSource}&area=${areaNo}&stage=${stageNo}`
      );
      const data = await response.json();

      if (data.success && data.details) {
        setStageDetails(data.details);
      } else {
        setError(data.error || '未找到该关卡信息');
      }
    } catch (err) {
      console.error('❌ [StageDetailPage] 加载关卡详情时发生错误:', err);
      setError('加载关卡详情时发生错误');
    } finally {
      setLoading(false);
    }
  };

  // 加载状态
  if (loading) {
    return (
      <>
        {/* 固定背景层 */}
        {backgroundImage && (
          <div
            className="fixed inset-0 z-0 min-h-screen-fill"
            style={{
              ...getBackgroundStyle(backgroundImage),
              height: '100%'
            }}
          />
        )}

        {/* 半透明覆盖层 */}
        <div className="fixed inset-0 z-10 bg-black/50 min-h-screen-fill"></div>

        {/* 内容区域 */}
        <div className="relative z-20 flex items-center justify-center min-h-screen-fill">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-8 shadow-2xl border border-white/20 max-w-xs sm:max-w-md w-full">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 sm:h-8 w-6 sm:w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-800 font-medium text-sm sm:text-base">加载关卡详情中...</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  // 错误状态
  if (error) {
    return (
      <>
        {/* 固定背景层 */}
        {backgroundImage && (
          <div
            className="fixed inset-0 z-0 min-h-screen-fill"
            style={{
              ...getBackgroundStyle(backgroundImage),
              height: '100%'
            }}
          />
        )}

        {/* 半透明覆盖层 */}
        <div className="fixed inset-0 z-10 bg-black/50 min-h-screen-fill"></div>

        {/* 内容区域 */}
        <div className="relative z-20 flex items-center justify-center p-4 min-h-screen-fill">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-8 shadow-2xl border border-white/20 max-w-xs sm:max-w-md w-full text-center">
            <div className="text-3xl sm:text-4xl mb-2 sm:mb-4">⚠️</div>
            <h2 className="text-base sm:text-xl font-bold text-red-800 mb-2 sm:mb-4">加载失败</h2>
            <p className="text-red-600 mb-4 sm:mb-6 text-sm sm:text-base">{error}</p>
            <div className="space-y-3">
              <button
                onClick={loadStageDetails}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm sm:text-base"
              >
                重试
              </button>
              <a
                href="/stage"
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors inline-block font-medium text-sm sm:text-base"
              >
                返回关卡列表
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  // 关卡详情
  if (stageDetails) {
    return (
      <>
        {/* 固定背景层 */}
        {backgroundImage && (
          <div
            className="fixed inset-0 z-0 min-h-screen-fill"
            style={{
              ...getBackgroundStyle(backgroundImage),
              height: '100%'
            }}
          />
        )}

        {/* 半透明覆盖层 */}
        <div className="fixed inset-0 z-10 bg-black/50 min-h-screen-fill"></div>

        {/* 内容区域 */}
        <div className="relative z-20 min-h-screen-fill">
          {/* 导航栏 */}
          <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
            <div className="mx-auto px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex  sm:flex-row items-center justify-between">
                {/* 面包屑导航和返回按钮 */}
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-2 sm:mb-0">
                  {/* 返回按钮 */}
                  <div className="flex items-center space-x-2">
                    <a
                      href="/"
                      className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-colors flex items-center space-x-1 border border-white/30 text-xs sm:text-sm hover:scale-105 font-medium"
                    >
                      <span>←</span>
                      <span>首页</span>
                    </a>
                    <a
                      href={`/stage?source=${returnSource}`}
                      className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-colors flex items-center space-x-1 border border-white/30 text-xs sm:text-sm hover:scale-105 font-medium"
                    >
                      <span>←</span>
                      <span>关卡列表</span>
                    </a>
                  </div>
                </div>

                {/* 数据源切换 */}
                <div className="flex items-center space-x-2 text-xs sm:text-sm">
                  <span className="text-white/80 font-medium">数据源：</span>
                  <div className="relative inline-flex bg-white/10 backdrop-blur-sm rounded-full p-1 border border-white/20">
                    <a
                      href={`/stage/${areaNo}-${stageNo}?source=live&returnSource=${returnSource}`}
                      className={`px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all duration-300 ${dataSource === 'live'
                        ? 'bg-white text-gray-900 shadow-lg'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                    >
                      正式服
                    </a>
                    <a
                      href={`/stage/${areaNo}-${stageNo}?source=review&returnSource=${returnSource}`}
                      className={`px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-medium rounded-full transition-all duration-300 ${dataSource === 'review'
                        ? 'bg-white text-gray-900 shadow-lg'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                    >
                      测试服
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 关卡详情组件 */}
          <div className="mx-auto p-1 sm:p-6">
            <StageDetails stageDetails={stageDetails} dataSource={dataSource} />
          </div>

          {/* 关卡导航悬浮窗 */}
          <StageNavigator currentStageId={stageId} dataSource={dataSource} />
        </div>
      </>
    );
  }

  return null;
}