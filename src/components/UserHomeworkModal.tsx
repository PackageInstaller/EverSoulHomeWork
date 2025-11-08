'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MarkdownRenderer from './MarkdownRenderer';

interface Homework {
  id: string;
  stageId: string;
  description: string;
  teamCount: number;
  createdAt: string;
  isAfterSettlement?: boolean; // 是否在结算后提交
  isHalved?: boolean; // 是否减半
  thumbnail: string | null;
}

interface GroupedArea {
  area: number;
  stages: string[];
}

interface UserHomeworkModalProps {
  nickname: string;
  onClose: () => void;
}

export default function UserHomeworkModal({ nickname, onClose }: UserHomeworkModalProps) {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [groupedByArea, setGroupedByArea] = useState<GroupedArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedArea, setSelectedArea] = useState<number | null>(null); // null表示显示全部

  useEffect(() => {
    fetchHomeworks();
  }, [nickname, page]);

  const fetchHomeworks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/homework/by-user?nickname=${encodeURIComponent(nickname)}&page=${page}&limit=50`);
      const data = await response.json();

      if (data.success) {
        setHomeworks(data.homeworks);
        setGroupedByArea(data.groupedByArea);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } else {
        setError('获取作业失败');
      }
    } catch (error) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 按ESC关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // 过滤作业：根据选中的区域
  const filteredHomeworks = selectedArea === null
    ? homeworks
    : homeworks.filter(hw => {
      const area = parseInt(hw.stageId.split('-')[0]);
      return area === selectedArea;
    });

  // 统计每个区域的作业数
  const getAreaHomeworkCount = (area: number) => {
    return homeworks.filter(hw => {
      const hwArea = parseInt(hw.stageId.split('-')[0]);
      return hwArea === area;
    }).length;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      {/* 背景点击关闭 */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* 内容区域 */}
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/20 w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* 头部 */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* 头像 */}
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl shadow-lg flex-shrink-0">
                {nickname.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {nickname} 的作业
                </h2>
                <p className="text-white/80 text-sm mt-1">
                  共 {total} 个已审核通过的作业
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-white/70">正在加载...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-300">{error}</p>
            </div>
          ) : homeworks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/70">该玩家暂无已审核通过的作业</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 区域筛选 */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="text-white font-semibold mb-3">📊 章节筛选（点击查看）</h3>
                <div className="flex flex-wrap gap-2">
                  {/* 全部按钮 */}
                  <button
                    onClick={() => setSelectedArea(null)}
                    className={`rounded-lg px-4 py-2 transition-all ${selectedArea === null
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 border border-blue-400 shadow-lg scale-105'
                        : 'bg-white/10 border border-white/20 hover:bg-white/20 hover:scale-105'
                      }`}
                  >
                    <span className="text-white font-medium">全部</span>
                    <span className="text-white/70 text-sm ml-2">
                      ({homeworks.length}个)
                    </span>
                  </button>

                  {/* 各区域按钮 */}
                  {groupedByArea.map(group => {
                    const count = getAreaHomeworkCount(group.area);
                    const isSelected = selectedArea === group.area;

                    return (
                      <button
                        key={group.area}
                        onClick={() => setSelectedArea(group.area)}
                        className={`rounded-lg px-4 py-2 transition-all ${isSelected
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 border border-blue-400 shadow-lg scale-105'
                            : 'bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 hover:scale-105'
                          }`}
                      >
                        <span className="text-white font-medium">{group.area}图</span>
                        <span className="text-white/70 text-sm ml-2">
                          ({count}个)
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 作业列表 */}
              <div>
                <h3 className="text-white font-semibold mb-3">
                  📝 作业列表
                  {selectedArea !== null && (
                    <span className="text-white/60 text-sm ml-2">
                      - 第{selectedArea}图
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredHomeworks.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <p className="text-white/50">该区域暂无作业</p>
                    </div>
                  ) : (
                    filteredHomeworks.map(homework => (
                      <Link
                        key={homework.id}
                        href={`/stage/${homework.stageId}?source=live&returnSource=live`}
                        className="group bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 overflow-hidden transition-all hover:scale-105 hover:shadow-xl"
                      >
                        {/* 缩略图 */}
                        {homework.thumbnail ? (
                          <div className="relative h-32 bg-black/20 overflow-hidden">
                            <img
                              src={homework.thumbnail}
                              alt={`${homework.stageId}作业`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                          </div>
                        ) : (
                          <div className="h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                            <span className="text-white/50 text-4xl">📝</span>
                          </div>
                        )}

                        {/* 信息 */}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-bold text-lg">
                              {homework.stageId}
                            </span>
                            <span className="text-white/60 text-sm">
                              {homework.teamCount}队
                            </span>
                          </div>
                          {homework.description && (
                            <div className="text-white/70 text-sm mb-2 line-clamp-4 overflow-hidden">
                              <MarkdownRenderer content={homework.description} />
                            </div>
                          )}
                          {(homework.isAfterSettlement || homework.isHalved) && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {homework.isAfterSettlement && (
                                <span className="inline-flex items-center gap-1 text-xs text-yellow-300 bg-yellow-500/20 px-2 py-0.5 rounded">
                                  ⏰ 结算后提交 · 仅计入总榜
                                </span>
                              )}
                              {homework.isHalved && (
                                <span className="inline-flex items-center gap-1 text-xs text-orange-300 bg-orange-500/20 px-2 py-0.5 rounded">
                                  ⚡ 非首发作业 · 积分减半
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/50">
                              {new Date(homework.createdAt).toLocaleString('zh-CN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false
                              })}
                            </span>
                            <span className="text-blue-400 group-hover:text-blue-300">
                              查看关卡 →
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-4 pt-6">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white rounded-lg transition-colors"
                  >
                    上一页
                  </button>
                  <span className="text-white">
                    第 {page} 页，共 {totalPages} 页
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white rounded-lg transition-colors"
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
