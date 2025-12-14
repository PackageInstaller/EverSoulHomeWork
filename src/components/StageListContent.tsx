'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getRandomMainStoryBackground, getBackgroundStyle } from '@/utils/backgroundUtils';
import { Stage, DataSource } from '@/types';
import BatchHomeworkUpload from './BatchHomeworkUpload';

interface StageListContentProps {
  initialStages?: Stage[];
}

export default function StageListContent({ initialStages = [] }: StageListContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [liveStages, setLiveStages] = useState<Stage[]>([]);
  const [reviewStages, setReviewStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [preloadComplete, setPreloadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [stageTeamCounts, setStageTeamCounts] = useState<Record<string, number>>({});

  // 从URL参数获取数据源，默认为live
  const dataSource = (searchParams.get('source') || 'live') as DataSource;

  // 根据当前数据源选择对应的stages
  const stages = dataSource === 'live' ? liveStages : reviewStages;

  useEffect(() => {
    loadAllStages();
    // 每次加载时设置随机背景
    setBackgroundImage(getRandomMainStoryBackground());
  }, []);

  const addDebugInfo = (message: string) => {
    console.log(`[Debug] ${message}`);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const loadAllStages = async () => {
    try {
      setLoading(true);
      setError(null);
      addDebugInfo('开始从服务器加载关卡列表');

      // 并行加载两个数据源（通过 API）
      const [liveData, reviewData] = await Promise.allSettled([
        fetch('/api/stages/list?source=live').then(res => res.json()),
        fetch('/api/stages/list?source=review').then(res => res.json())
      ]);

      // 处理 live 数据
      if (liveData.status === 'fulfilled' && liveData.value.success) {
        setLiveStages(liveData.value.stages);
        addDebugInfo(`Live数据源加载成功: ${liveData.value.stages.length} 个关卡（服务器缓存）`);
      } else {
        addDebugInfo(`Live数据源加载失败: ${liveData.status === 'fulfilled' ? liveData.value.error : liveData.reason}`);
        console.error('Live数据加载失败:', liveData);
      }

      // 处理 review 数据
      if (reviewData.status === 'fulfilled' && reviewData.value.success) {
        setReviewStages(reviewData.value.stages);
        addDebugInfo(`Review数据源加载成功: ${reviewData.value.stages.length} 个关卡（服务器缓存）`);
      } else {
        addDebugInfo(`Review数据源加载失败: ${reviewData.status === 'fulfilled' ? reviewData.value.error : reviewData.reason}`);
        console.error('Review数据加载失败:', reviewData);
      }

      // 检查是否至少有一个数据源加载成功
      const liveSuccess = liveData.status === 'fulfilled' && liveData.value.success;
      const reviewSuccess = reviewData.status === 'fulfilled' && reviewData.value.success;

      if (!liveSuccess && !reviewSuccess) {
        setError('所有数据源加载失败');
        addDebugInfo('❌ 所有数据源都无法加载');
      } else {
        setPreloadComplete(true);
        addDebugInfo('✅ 数据加载完成（使用服务器缓存）');
      }

    } catch (error) {
      console.error('❌ [StageListPage] 加载时发生错误:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setError(`加载失败: ${errorMessage}`);
      addDebugInfo(`加载失败: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // 按区域分组关卡
  const stagesByArea = stages.reduce((acc, stage) => {
    if (!acc[stage.area_no]) {
      acc[stage.area_no] = [];
    }
    acc[stage.area_no].push(stage);
    return acc;
  }, {} as Record<number, Stage[]>);

  // 计算区域统计信息
  const getAreaStats = (areaStages: Stage[]) => {
    const maxStage = Math.max(...areaStages.map(s => s.stage_no));
    return {
      count: areaStages.length,
      maxStage: maxStage
    };
  };

  // 打开章节详情模态框
  const openAreaModal = async (areaNo: number) => {
    setSelectedArea(areaNo);
    
    // 获取该章节所有关卡的teamCount
    const areaStages = stagesByArea[areaNo];
    if (areaStages && areaStages.length > 0) {
      const stageIds = areaStages.map(s => `${s.area_no}-${s.stage_no}`).join(',');
      try {
        const timestamp = Date.now();
        const response = await fetch(
          `/api/stages/batch-info?source=${dataSource}&stageIds=${stageIds}&_t=${timestamp}`,
          {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
            cache: 'no-store',
          }
        );
        const data = await response.json();
        if (data.success && data.results) {
          const counts: Record<string, number> = {};
          for (const [stageId, info] of Object.entries(data.results)) {
            counts[stageId] = (info as any).teamCount;
          }
          setStageTeamCounts(counts);
        }
      } catch (error) {
        console.error('获取关卡teamCount失败:', error);
      }
    }
  };

  // 关闭模态框
  const closeAreaModal = () => {
    setSelectedArea(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white font-medium">正在预加载所有数据源...</p>
          <p className="mt-2 text-white/70 text-sm">Live & Review 数据同步加载中</p>
          <div className="mt-4 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-75"></div>
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-red-50 p-8 rounded-lg max-w-md">
          <h2 className="text-xl font-bold text-red-800 mb-4">加载失败</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadAllStages}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">暂无关卡数据</h2>
          <p className="text-gray-600 mb-4">请稍后重试或切换数据源</p>
          <button
            onClick={loadAllStages}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative min-h-screen-fill">
      {/* 固定背景 */}
      <div
        className="fixed inset-0 z-0 min-h-screen-fill"
        style={{
          ...getBackgroundStyle(backgroundImage),
          height: '100%'
        }}
      />

      {/* 内容层 */}
      <div className="relative z-10 min-h-screen-fill">
        {/* 导航栏 */}
        <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push('/')}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg transition-all duration-200 border border-white/30 text-sm hover:scale-105"
              >
                ← 返回首页
              </button>

              <div className="flex items-center space-x-4">
                <div className="relative inline-flex bg-white/10 backdrop-blur-sm rounded-full p-1 border border-white/20">
                  <button
                    onClick={() => router.push('/stage?source=live')}
                    className={`px-4 py-2 text-xs font-medium rounded-full transition-all duration-300 relative ${dataSource === 'live'
                        ? 'bg-white text-gray-900 shadow-lg transform scale-105'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    正式服
                  </button>
                  <button
                    onClick={() => router.push('/stage?source=review')}
                    className={`px-4 py-2 text-xs font-medium rounded-full transition-all duration-300 relative ${dataSource === 'review'
                        ? 'bg-white text-gray-900 shadow-lg transform scale-105'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    测试服
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 主要内容 */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* 控制面板 */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 mb-8 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">章节列表</h2>
                <p className="text-white/70 text-sm">共 {Array.from(new Set(stages.map(stage => stage.area_no))).length} 个章节</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {Object.keys(stagesByArea)
              .map(Number)
              .sort((a, b) => a - b)
              .map(areaNo => {
                const areaStages = stagesByArea[areaNo];
                const stats = getAreaStats(areaStages);
                return (
                  <div key={areaNo} className="bg-black/20 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group">
                    {/* 章节标题栏 - 点击打开模态框 */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openAreaModal(areaNo);
                      }}
                      className="w-full p-5 text-left hover:bg-white/10 transition-colors flex items-center justify-between bg-white/20 backdrop-blur-sm border-b border-white/10"
                    >
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-blue-200 transition-colors">
                          第 {areaNo} 章
                        </h3>
                        <p className="text-sm text-white/70 mt-1">
                          {stats.count} 个关卡 • 1-{stats.maxStage}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-white/60 group-hover:text-blue-200 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* 章节详情模态框 */}
      {selectedArea && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/20 backdrop-blur-sm rounded-xl shadow-2xl max-w-6xl max-h-[90vh] w-full overflow-hidden border border-white/20">
            {/* 模态框头部 */}
            <div className="bg-white/20 backdrop-blur-sm text-white p-6 border-b border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">第 {selectedArea} 章关卡详情</h2>
                <button
                  onClick={closeAreaModal}
                  className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* 批量上传按钮 */}
              <div className="flex items-center justify-between">
                <p className="text-white/80 text-sm">
                  快速为多个关卡上传作业，支持自动保存
                </p>
                <BatchHomeworkUpload
                  areaNo={selectedArea}
                  stages={stagesByArea[selectedArea].map(stage => {
                    const stageId = `${stage.area_no}-${stage.stage_no}`;
                    return {
                      stageId,
                      teamCount: stageTeamCounts[stageId] || 1,
                      areaNo: stage.area_no,
                      stageNo: stage.stage_no,
                    };
                  })}
                  dataSource={dataSource}
                />
              </div>
            </div>

            {/* 模态框内容 */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {stagesByArea[selectedArea] && (
                <div>
                  <div className="mb-4 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                    <p className="text-sm text-white">
                      共 {stagesByArea[selectedArea].length} 个关卡 •
                      关卡范围: {selectedArea}-1 到 {selectedArea}-{Math.max(...stagesByArea[selectedArea].map(s => s.stage_no))}
                    </p>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                    {stagesByArea[selectedArea]
                      .sort((a, b) => a.stage_no - b.stage_no)
                      .map(stage => (
                        <StageCard
                          key={`${stage.area_no}-${stage.stage_no}`}
                          stage={stage}
                          dataSource={dataSource}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 关卡卡片组件
function StageCard({ stage, dataSource }: { stage: Stage; dataSource: DataSource }) {
  return (
    <a
      href={`/stage/${stage.area_no}-${stage.stage_no}?source=${dataSource}&returnSource=${dataSource}`}
      className="block bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg p-2.5 text-center transition-all duration-200 group shadow-md hover:shadow-lg transform hover:scale-105 border border-white/30 hover:border-blue-300/50"
      title={`关卡 ${stage.area_no}-${stage.stage_no} | ID: ${stage.no}`}
    >
      <div className="text-xs font-bold group-hover:text-blue-200">
        {stage.area_no}-{stage.stage_no}
      </div>
    </a>
  );
} 