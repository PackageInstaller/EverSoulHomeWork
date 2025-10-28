'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// 动态导入三消游戏组件（避免SSR问题）
const MatchThreeGame = dynamic(() => import('@/components/MatchThreeGame'), { ssr: false });

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

  // 拖拽相关状态
  const getInitialPosition = () => {
    if (typeof window === 'undefined') {
      return { x: 0, y: 0 };
    }
    const buttonSize = window.innerWidth < 640 ? 56 : 64;
    const padding = 20; // 距离边缘的padding
    // 右下角显示
    return {
      x: window.innerWidth - buttonSize - padding,
      y: window.innerHeight - buttonSize - padding
    };
  };

  const [position, setPosition] = useState(getInitialPosition());
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false); // 记录是否真的拖动了
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 }); // 记录拖拽起始位置
  const dragRef = useRef<HTMLDivElement>(null);

  // 彩蛋相关状态
  const [totalDragTime, setTotalDragTime] = useState(0); // 累计拖动时间（秒）
  const [currentDragTime, setCurrentDragTime] = useState(0); // 当前这次拖动的时间（用于实时显示）
  const [showEasterEgg, setShowEasterEgg] = useState(false); // 是否显示三消游戏
  const dragTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartTimeRef = useRef<number>(0);
  const totalDragTimeRef = useRef<number>(0); // 用ref存储实时累计时间
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null); // 重置计时器

  // 确保初始位置正确（客户端渲染后）
  useEffect(() => {
    setPosition(getInitialPosition());
  }, []);

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
    if (hasDragged) {
      // 如果刚拖拽完，不打开
      setHasDragged(false);
      return;
    }
    setIsExpanded(true);
    // 立即开始动画，稍后标记为完成
    setTimeout(() => {
      setIsAnimating(false);
    }, 10);
  };

  const handleClose = () => {
    setIsAnimating(true);
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
    }
    // 等待动画完成后再隐藏（与打开动画时长一致）
    animationTimerRef.current = setTimeout(() => {
      setIsExpanded(false);
      setIsAnimating(false);
    }, 300); // 300ms动画 + 50ms缓冲
  };

  // 拖拽处理函数
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isExpanded || showEasterEgg) return;
    e.preventDefault();
    setIsDragging(true);
    setHasDragged(false);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    setDragStartPos({
      x: e.clientX,
      y: e.clientY
    });

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    dragStartTimeRef.current = Date.now();
    dragTimerRef.current = setInterval(() => {
      if (dragStartTimeRef.current > 0) {
        const currentDragDuration = (Date.now() - dragStartTimeRef.current) / 1000;
        const newTotalTime = totalDragTimeRef.current + currentDragDuration;

        setCurrentDragTime(currentDragDuration);

        // 是否达到10秒
        if (newTotalTime >= 10) {
          if (dragTimerRef.current) {
            clearInterval(dragTimerRef.current);
          }
          setShowEasterEgg(true);
          setIsDragging(false);
          setCurrentDragTime(0);
          dragStartTimeRef.current = 0;
        }
      }
    }, 100);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isExpanded || showEasterEgg) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setHasDragged(false);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
    setDragStartPos({
      x: touch.clientX,
      y: touch.clientY
    });

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    dragStartTimeRef.current = Date.now();
    dragTimerRef.current = setInterval(() => {
      if (dragStartTimeRef.current > 0) {
        const currentDragDuration = (Date.now() - dragStartTimeRef.current) / 1000;
        const newTotalTime = totalDragTimeRef.current + currentDragDuration;

        setCurrentDragTime(currentDragDuration);

        if (newTotalTime >= 10) {
          if (dragTimerRef.current) {
            clearInterval(dragTimerRef.current);
          }
          setShowEasterEgg(true);
          setIsDragging(false);
          setCurrentDragTime(0);
          dragStartTimeRef.current = 0;
        }
      }
    }, 100); // 每100ms检查一次
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // 计算移动距离，超过5px就认为是拖拽
    const deltaX = Math.abs(e.clientX - dragStartPos.x);
    const deltaY = Math.abs(e.clientY - dragStartPos.y);
    if (deltaX > 5 || deltaY > 5) {
      setHasDragged(true);
    }

    setPosition({ x: newX, y: newY });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];

    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;

    // 计算移动距离，超过5px就认为是拖拽
    const deltaX = Math.abs(touch.clientX - dragStartPos.x);
    const deltaY = Math.abs(touch.clientY - dragStartPos.y);
    if (deltaX > 5 || deltaY > 5) {
      setHasDragged(true);
    }

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    if (!isDragging) return;

    // 清除定时器（必须在setIsDragging之前）
    if (dragTimerRef.current) {
      clearInterval(dragTimerRef.current);
      dragTimerRef.current = null;
    }

    // 累计拖动时间
    if (dragStartTimeRef.current > 0) {
      const dragDuration = (Date.now() - dragStartTimeRef.current) / 1000; // 转换为秒
      const newTotalTime = totalDragTimeRef.current + dragDuration;
      totalDragTimeRef.current = newTotalTime;
      setTotalDragTime(newTotalTime);

      dragStartTimeRef.current = 0;
    }

    setCurrentDragTime(0);
    setIsDragging(false);

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = setTimeout(() => {
      totalDragTimeRef.current = 0;
      setTotalDragTime(0);
      resetTimerRef.current = null;
    }, 50); // 松开就重置
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, dragStart, position]);

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const buttonSize = window.innerWidth < 640 ? 56 : 64;

      setPosition(prev => {
        return {
          x: Math.max(0, Math.min(windowWidth - buttonSize, prev.x)),
          y: Math.max(0, Math.min(windowHeight - buttonSize, prev.y))
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
      if (dragTimerRef.current) {
        clearInterval(dragTimerRef.current);
      }
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* 三消游戏彩蛋 */}
      {showEasterEgg && (
        <MatchThreeGame onClose={() => {
          setShowEasterEgg(false);
          // 重置拖动时间
          setTotalDragTime(0);
          setCurrentDragTime(0);
          totalDragTimeRef.current = 0;
        }} />
      )}

      {/* 背景遮罩 - 仅在展开时显示 */}
      {isExpanded && (
        <div
          className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'
            }`}
          onClick={handleClose}
        />
      )}

      {/* 拖动进度提示 - 只有拖动超过5秒才显示 - 像素风格 */}
      {isDragging && (totalDragTime + currentDragTime >= 5) && (
        <div
          className="fixed top-1/2 left-1/2 z-[60] pointer-events-none"
          style={{
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div
            className="bg-black text-white px-6 py-4 shadow-2xl"
            style={{
              border: '4px solid #fff',
              boxShadow: '0 0 0 4px #000, 8px 8px 0 0 rgba(0,0,0,0.3)',
              imageRendering: 'pixelated'
            }}
          >
            <p
              className="text-lg font-bold text-center mb-3"
              style={{
                fontFamily: 'monospace',
                textShadow: '2px 2px 0 #000',
                letterSpacing: '0.1em'
              }}
            >
              永恒爆爆乐加载中
            </p>

            {/* 像素风进度条外框 */}
            <div
              className="w-64 mx-auto"
              style={{
                border: '3px solid #fff',
                background: '#333',
                boxShadow: 'inset 0 0 0 2px #000'
              }}
            >
              {/* 进度条填充 */}
              <div
                className="h-6 transition-all duration-100"
                style={{
                  width: `${Math.min((totalDragTime + currentDragTime) / 10 * 100, 100)}%`,
                  background: 'linear-gradient(180deg, #ffd700 0%, #ff8c00 50%, #ff6347 100%)',
                  boxShadow: 'inset 2px 2px 0 rgba(255,255,255,0.3), inset -2px -2px 0 rgba(0,0,0,0.3)',
                  imageRendering: 'pixelated'
                }}
              />
            </div>

            <p
              className="text-sm mt-3 text-center"
              style={{
                fontFamily: 'monospace',
                color: '#ffff00',
                textShadow: '1px 1px 0 #000',
                letterSpacing: '0.05em'
              }}
            >
            </p>
          </div>
        </div>
      )}

      {/* 悬浮球形按钮 / 展开的选择框 - Container Transform */}
      <div
        ref={dragRef}
        className={`
          fixed z-50 bg-blue-600 overflow-hidden
          ${isDragging ? 'cursor-grabbing' : !isExpanded ? 'cursor-grab' : ''}
        `}
        style={{
          // 位置
          left: !isExpanded ? `${position.x}px` : '50%',
          top: !isExpanded ? `${position.y}px` : '50%',
          transform: !isExpanded
            ? (isAnimating ? 'scale(0.8) rotate(-90deg)' : 'none')
            : 'translate(-50%, -50%)',

          // 尺寸和圆角
          width: !isExpanded
            ? (window.innerWidth < 640 ? '56px' : '64px')
            : (window.innerWidth < 640 ? '90vw' : '440px'),
          height: !isExpanded
            ? (window.innerWidth < 640 ? '56px' : '64px')
            : (window.innerWidth < 640 ? '85vh' : '600px'),
          borderRadius: !isExpanded ? '50%' : '24px',

          // 透明度
          opacity: (isAnimating && !isExpanded) ? 0 : 1,

          // 阴影
          boxShadow: !isExpanded
            ? (isDragging ? '0 12px 32px rgba(37, 99, 235, 0.5)' : '0 8px 24px rgba(37, 99, 235, 0.4)')
            : '0 20px 60px rgba(0, 0, 0, 0.2)',

          // 过渡动画
          transition: isDragging
            ? 'none'
            : 'all 400ms cubic-bezier(0.4, 0.0, 0.2, 1)',
        }}
      >
        {/* 球形按钮状态 - 涟漪效果背景 */}
        {!isExpanded && (
          <button
            onClick={handleOpen}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="relative w-full h-full flex items-center justify-center group overflow-hidden touch-none"
            title="拖动可移动位置，点击展开关卡导航"
          >
            {/* 涟漪效果层 */}
            <div className="absolute inset-0 bg-blue-700 opacity-0 group-active:opacity-100 group-active:scale-150 transition-all duration-200 rounded-full pointer-events-none"></div>

            {/* 图标 - 点击时淡出 */}
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 text-white group-hover:scale-110 transition-transform relative z-10 pointer-events-none"
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

        {/* 展开的选择框状态 - 内容淡入 */}
        {isExpanded && (
          <div
            className="w-full h-full bg-white flex flex-col"
            style={{
              opacity: isAnimating ? 0 : 1,
              transition: 'opacity 300ms ease-out'
            }}
          >
            {/* 头部 - 向下滑入 */}
            <div
              className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 bg-white border-b border-gray-100 flex-shrink-0"
              style={{
                opacity: isAnimating ? 0 : 1,
                transform: isAnimating ? 'translateY(-16px)' : 'translateY(0)',
                transition: 'all 300ms cubic-bezier(0.4, 0.0, 0.2, 1) 50ms'
              }}
            >
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

            {/* 关卡网格 - 放大淡入 */}
            <div
              className="flex-1 overflow-y-auto p-4"
              style={{
                minHeight: 0,
                opacity: isAnimating ? 0 : 1,
                transform: isAnimating ? 'scale(0.95)' : 'scale(1)',
                transition: 'all 300ms cubic-bezier(0.4, 0.0, 0.2, 1) 100ms'
              }}
            >
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

            {/* 底部说明 - 向上滑入 */}
            <div
              className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex-shrink-0"
              style={{
                opacity: isAnimating ? 0 : 1,
                transform: isAnimating ? 'translateY(16px)' : 'translateY(0)',
                transition: 'all 300ms cubic-bezier(0.4, 0.0, 0.2, 1) 50ms'
              }}
            >
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
