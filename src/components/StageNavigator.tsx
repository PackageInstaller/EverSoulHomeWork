'use client';

import { useState, useEffect } from 'react';
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
  const [position, setPosition] = useState<'left' | 'right'>('right');
  const [availableStages, setAvailableStages] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

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

  const togglePosition = () => {
    setPosition(prev => prev === 'left' ? 'right' : 'left');
  };

  return (
    <>
      {/* 悬浮按钮 */}
      <div
        className={`fixed top-1/2 -translate-y-1/2 ${
          position === 'right' ? 'right-0' : 'left-0'
        } z-50 transition-all duration-300`}
      >
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className={`
              bg-blue-600 hover:bg-blue-700 text-white px-3 py-6 shadow-lg
              flex flex-col items-center gap-1 transition-all
              ${position === 'right' ? 'rounded-l-lg' : 'rounded-r-lg'}
            `}
            title="打开关卡导航"
          >
            <span className="text-xs writing-mode-vertical">关卡</span>
            <span className="text-xs writing-mode-vertical">导航</span>
          </button>
        )}
      </div>

      {/* 悬浮窗 */}
      {isExpanded && (
        <div
          className={`
            fixed z-50 w-80 max-h-[80vh] bg-white/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-200
            transition-all duration-300 ease-out top-1/2 -translate-y-1/2
            ${position === 'right' ? 'right-2' : 'left-2'}
          `}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
            <h3 className="font-bold text-lg">第 {currentArea} 章关卡</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={togglePosition}
                className="p-1 hover:bg-blue-700 rounded transition-colors"
                title="切换位置"
              >
                {position === 'right' ? '←' : '→'}
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-blue-700 rounded transition-colors"
                title="关闭"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 关卡网格 */}
          <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">加载关卡列表...</span>
              </div>
            ) : stages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无关卡数据
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {stages.map((stage) => (
                  <button
                    key={stage.id}
                    onClick={() => handleStageClick(stage.id)}
                    disabled={stage.isCurrent}
                    className={`
                      aspect-square rounded-lg font-medium text-sm transition-all
                      ${
                        stage.isCurrent
                          ? 'bg-blue-600 text-white ring-2 ring-blue-400 cursor-default'
                          : 'bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-600 hover:ring-2 hover:ring-blue-300'
                      }
                      disabled:cursor-default
                    `}
                    title={`${stage.area}-${stage.stage}`}
                  >
                    {stage.stage}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 底部说明 */}
          <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <p className="text-xs text-gray-600 text-center">
              {!loading && stages.length > 0 && (
                <span className="font-medium text-blue-600">
                  本章共 {stages.length} 关 · 
                </span>
              )}
              {' '}点击关卡编号快速跳转，点击箭头切换位置
            </p>
          </div>
        </div>
      )}
    </>
  );
}
