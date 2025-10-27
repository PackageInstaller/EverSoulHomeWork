'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Stage {
  area_no: number;
  stage_no: number;
}

interface StageNavigatorProps {
  currentStageId: string;
  dataSource: string;
}

export default function StageNavigator({ currentStageId, dataSource }: StageNavigatorProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [availableStages, setAvailableStages] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 解析当前关卡，获取章节和关卡号
  const [currentArea, currentStage] = currentStageId.split('-').map(Number);

  // 获取当前章节实际有哪些关卡
  useEffect(() => {
    const fetchStageList = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/stages/list?source=${dataSource}`);
        const data = await response.json();

        if (data.success && data.stages) {
          // 筛选出当前章节的关卡
          const currentAreaStages = data.stages
            .filter((stage: Stage) => stage.area_no === currentArea)
            .map((stage: Stage) => stage.stage_no)
            .sort((a: number, b: number) => a - b);

          setAvailableStages(currentAreaStages);
        }
      } catch (error) {
        console.error('获取关卡列表失败:', error);
        // 如果获取失败，默认显示60关
        setAvailableStages(Array.from({ length: 60 }, (_, i) => i + 1));
      } finally {
        setLoading(false);
      }
    };

    fetchStageList();
  }, [currentArea, dataSource]);

  // 生成当前章节的关卡列表（基于实际存在的关卡）
  const stages = availableStages.map(stageNum => ({
    id: `${currentArea}-${stageNum}`,
    area: currentArea,
    stage: stageNum,
    isCurrent: stageNum === currentStage,
  }));

  const handleStageClick = (stageId: string) => {
    router.push(`/stage/${stageId}?source=${dataSource}`);
  };

  const handleOpen = () => {
    setIsAnimating(true);
    setIsExpanded(true);
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
    }
    animationTimerRef.current = setTimeout(() => {
      setIsAnimating(false);
    }, 500);
  };

  const handleClose = () => {
    setIsAnimating(true);
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
    }
    animationTimerRef.current = setTimeout(() => {
      setIsExpanded(false);
      setIsAnimating(false);
    }, 400);
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* 背景遮罩 - 仅在展开时显示 */}
      {isExpanded && (
        <div 
          className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
            isAnimating ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={handleClose}
        />
      )}

      {/* 悬浮球形按钮 / 展开的选择框 */}
      <div
        className={`
          fixed z-50 
          ${!isExpanded 
            ? 'bottom-6 right-6 w-14 h-14 sm:w-16 sm:h-16' 
            : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] sm:w-[440px] h-[85vh] sm:h-[600px]'
          }
          ${isAnimating && !isExpanded ? 'scale-0 opacity-0 rotate-180' : ''}
          ${isAnimating && isExpanded ? 'scale-90 opacity-0 rotate-12' : 'scale-100 opacity-100 rotate-0'}
        `}
        style={{
          transitionProperty: 'all',
          transitionDuration: '500ms',
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        {/* 球形按钮状态 */}
        {!isExpanded && (
          <button
            onClick={handleOpen}
            className="w-full h-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full shadow-xl flex items-center justify-center transition-colors duration-200 group"
            style={{
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)'
            }}
            title="打开关卡导航"
          >
            <svg 
              className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-110 transition-transform" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" 
              />
            </svg>
          </button>
        )}

        {/* 展开的选择框状态 */}
        {isExpanded && (
          <div 
            className="w-full h-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            style={{
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)'
            }}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 bg-white border-b border-gray-100 flex-shrink-0">
              <h3 className="font-semibold text-base sm:text-lg text-gray-900">第 {currentArea} 章关卡</h3>
              
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors active:bg-gray-200"
                title="关闭"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 关卡网格 - 固定高度可滚动 */}
            <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent"></div>
                  <span className="ml-3 text-gray-600 text-sm">加载中...</span>
                </div>
              ) : stages.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-400 text-sm">暂无关卡数据</p>
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-2">
                  {stages.map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => handleStageClick(stage.id)}
                      disabled={stage.isCurrent}
                      className={`
                        aspect-square rounded-xl font-medium text-sm
                        transition-all duration-150
                        ${stage.isCurrent
                          ? 'bg-blue-600 text-white shadow-md scale-105 cursor-default'
                          : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-600 active:scale-95'
                        }
                        disabled:cursor-default
                      `}
                      style={stage.isCurrent ? {
                        boxShadow: '0 4px 8px rgba(37, 99, 235, 0.3)'
                      } : undefined}
                      title={`${stage.area}-${stage.stage}`}
                    >
                      {stage.stage}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 底部说明 */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex-shrink-0">
              <p className="text-xs text-gray-600 text-center">
                {!loading && stages.length > 0 && (
                  <span className="font-medium text-gray-700">
                    本章共 {stages.length} 关 ·{' '}
                  </span>
                )}
                点击关卡编号快速跳转
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
