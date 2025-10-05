'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Homework {
  id: string;
  stageId: string;
  description: string;
  teamCount: number;
  createdAt: string;
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      {/* 背景点击关闭 */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* 内容区域 */}
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/20 w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* 头部 */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                👤 {nickname} 的作业
              </h2>
              <p className="text-white/80 text-sm mt-1">
                共 {total} 个已审核通过的作业
              </p>
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
              {/* 区域统计 */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h3 className="text-white font-semibold mb-3">📊 区域分布</h3>
                <div className="flex flex-wrap gap-2">
                  {groupedByArea.map(group => (
                    <div
                      key={group.area}
                      className="bg-blue-500/20 border border-blue-500/30 rounded-lg px-3 py-2"
                    >
                      <span className="text-white font-medium">{group.area}图</span>
                      <span className="text-white/70 text-sm ml-2">
                        ({group.stages.length}关)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 作业列表 */}
              <div>
                <h3 className="text-white font-semibold mb-3">📝 作业列表</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {homeworks.map(homework => (
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
                          <p className="text-white/70 text-sm line-clamp-2 mb-2">
                            {homework.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">
                            {new Date(homework.createdAt).toLocaleDateString('zh-CN')}
                          </span>
                          <span className="text-blue-400 group-hover:text-blue-300">
                            查看关卡 →
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
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
