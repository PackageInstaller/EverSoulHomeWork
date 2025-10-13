'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface StageNavigatorProps {
  currentStageId: string;
  dataSource: string;
}

export default function StageNavigator({ currentStageId, dataSource }: StageNavigatorProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState<'left' | 'right'>('right');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 解析当前关卡，获取章节和关卡号
  const [currentArea, currentStage] = currentStageId.split('-').map(Number);

  // 生成当前章节的所有关卡（每个章节有60关）
  const stages = Array.from({ length: 60 }, (_, i) => {
    const stageNum = i + 1;
    return {
      id: `${currentArea}-${stageNum}`,
      area: currentArea,
      stage: stageNum,
      isCurrent: stageNum === currentStage,
    };
  });

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        setCurrentPos({ x: newX, y: newY });
      };

      const handleMouseUp = (e: MouseEvent) => {
        setIsDragging(false);
        // 计算离哪边更近
        const windowWidth = window.innerWidth;
        const elementX = e.clientX;
        
        if (elementX < windowWidth / 2) {
          setPosition('left');
        } else {
          setPosition('right');
        }
        
        // 重置位置
        setCurrentPos({ x: 0, y: 0 });
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

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
          ref={containerRef}
          className={`
            fixed z-50 w-80 max-h-[80vh] bg-white/95 backdrop-blur-md rounded-lg shadow-2xl border border-gray-200
            transition-all
            ${!isDragging && (position === 'right' ? 'right-2' : 'left-2')}
            ${!isDragging && 'top-1/2 -translate-y-1/2'}
            ${isDragging ? 'cursor-grabbing' : 'cursor-auto'}
          `}
          style={
            isDragging
              ? {
                  left: currentPos.x,
                  top: currentPos.y,
                  transform: 'none',
                }
              : {}
          }
        >
          {/* 头部（可拖动区域） */}
          <div
            className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
          >
            <h3 className="font-bold text-lg select-none">第 {currentArea} 章关卡</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={togglePosition}
                className="p-1 hover:bg-blue-700 rounded transition-colors"
                title="切换位置"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {position === 'right' ? '←' : '→'}
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-blue-700 rounded transition-colors"
                title="关闭"
                onMouseDown={(e) => e.stopPropagation()}
              >
                ✕
              </button>
            </div>
          </div>

          {/* 关卡网格 */}
          <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
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
          </div>

          {/* 底部说明 */}
          <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <p className="text-xs text-gray-600 text-center select-none">
              拖动标题栏可移动位置，松手自动靠边
            </p>
          </div>
        </div>
      )}
    </>
  );
}
