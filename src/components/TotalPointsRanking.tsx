'use client';

import { useState, useEffect } from 'react';

// 总积分排行项接口
interface TotalPointsRankItem {
  id: number;
  rank: number;
  nickname: string;
  totalPoints: number;
  homeworkCount: number;
  lastUpdated: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function TotalPointsRanking() {
  const [searchTerm, setSearchTerm] = useState('');
  const [rankPagination, setRankPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [currentRankList, setCurrentRankList] = useState<TotalPointsRankItem[]>([]);
  const [rankLoading, setRankLoading] = useState(false);
  const [rankStats, setRankStats] = useState({
    totalUsers: 0,
    highestPoints: 0,
    avgHomework: 0,
  });

  // 获取总积分排行数据
  const fetchTotalRank = async () => {
    setRankLoading(true);
    try {
      const response = await fetch(
        `/api/points/total-rank?page=${rankPagination.page}&limit=${rankPagination.limit}&search=${searchTerm}`
      );
      const result = await response.json();

      if (result.success) {
        setCurrentRankList(result.data);
        setRankPagination((prev) => ({
          ...prev,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
        }));

        // 计算统计数据
        if (result.data.length > 0) {
          const totalUsers = result.pagination.total;
          const highestPoints = result.data[0]?.totalPoints || 0;
          const avgHomework =
            result.data.reduce(
              (sum: number, item: TotalPointsRankItem) => sum + item.homeworkCount,
              0
            ) / result.data.length;

          setRankStats({
            totalUsers,
            highestPoints,
            avgHomework: Math.round(avgHomework),
          });
        }
      }
    } catch (error) {
      console.error('获取总积分排行失败:', error);
    } finally {
      setRankLoading(false);
    }
  };

  // 当页码或搜索词变化时重新获取数据
  useEffect(() => {
    fetchTotalRank();
  }, [rankPagination.page, searchTerm]);

  // 搜索词变化时重置页码
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setRankPagination((prev) => ({ ...prev, page: 1 }));
  };

  // 总积分排行分页切换
  const handleRankPageChange = (newPage: number) => {
    if (newPage < 1 || newPage > rankPagination.totalPages) return;
    setRankPagination((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <div className="space-y-6">
      {/* 标题和搜索 */}
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-white">📊 总积分排行榜</h2>
          <div className="w-full md:w-auto">
            <input
              type="text"
              placeholder="搜索用户昵称..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
            />
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-blue-500/30">
            <div className="text-white/70 text-sm mb-1">参与用户总数</div>
            <div className="text-2xl font-bold text-blue-300">
              {rankStats.totalUsers} 人
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-500/30">
            <div className="text-white/70 text-sm mb-1">总积分最高</div>
            <div className="text-2xl font-bold text-green-300">
              {rankStats.highestPoints.toFixed(1)} 分
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-500/30">
            <div className="text-white/70 text-sm mb-1">平均作业数</div>
            <div className="text-2xl font-bold text-yellow-300">
              {rankStats.avgHomework} 个
            </div>
          </div>
        </div>
      </div>

      {/* 排行列表 */}
      {rankLoading ? (
        <div className="text-center py-12 bg-black/20 backdrop-blur-sm rounded-xl border border-white/20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-white/70">正在加载排行数据...</p>
        </div>
      ) : currentRankList.length === 0 ? (
        <div className="text-center py-12 bg-black/20 backdrop-blur-sm rounded-xl border border-white/20">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-white/70 text-lg">暂无排行数据</p>
          <p className="text-white/50 text-sm mt-2">
            {searchTerm ? '没有找到匹配的用户' : '还没有用户提交作业'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {currentRankList.map((item) => {
              let rankStyle = 'bg-white/5';
              let rankIcon = `#${item.rank}`;

              if (item.rank === 1) {
                rankStyle =
                  'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50';
                rankIcon = '🥇';
              } else if (item.rank === 2) {
                rankStyle =
                  'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-2 border-gray-400/50';
                rankIcon = '🥈';
              } else if (item.rank === 3) {
                rankStyle =
                  'bg-gradient-to-r from-orange-400/20 to-orange-600/20 border-2 border-orange-400/50';
                rankIcon = '🥉';
              }

              return (
                <div
                  key={item.id}
                  className={`${rankStyle} backdrop-blur-sm rounded-xl p-4 border border-white/10 transition-transform hover:scale-[1.02]`}
                >
                  <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
                    <div className="flex items-center space-x-4 w-full sm:w-auto">
                      <div className="text-2xl font-bold text-white/80 w-12 text-center flex-shrink-0">
                        {rankIcon}
                      </div>
                      <div className="flex-1">
                        <div className="text-lg font-semibold text-white">
                          {item.nickname}
                        </div>
                        <div className="text-sm text-white/60">
                          完成作业 {item.homeworkCount} 个 • 最后更新：
                          {item.lastUpdated}
                        </div>
                      </div>
                    </div>

                    <div className="text-right w-full sm:w-auto">
                      <div className="text-xl font-bold text-blue-300">
                        {item.totalPoints.toFixed(1)} 总积分
                      </div>
                      <div className="text-sm text-white/50">
                        平均每作业{' '}
                        {(item.totalPoints / item.homeworkCount || 0).toFixed(1)}{' '}
                        分
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 分页控件 */}
          {rankPagination.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-4">
              <button
                onClick={() => handleRankPageChange(rankPagination.page - 1)}
                disabled={rankPagination.page === 1}
                className="px-4 py-2 bg-white/10 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
              >
                上一页
              </button>
              <span className="px-4 py-2 text-white">
                第 {rankPagination.page} 页 / 共 {rankPagination.totalPages} 页
              </span>
              <button
                onClick={() => handleRankPageChange(rankPagination.page + 1)}
                disabled={rankPagination.page === rankPagination.totalPages}
                className="px-4 py-2 bg-white/10 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

