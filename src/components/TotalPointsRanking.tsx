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
    <div className="space-y-6 px-4">
      {/* 标题和搜索 */}
      <div className="bg-gradient-to-br from-black/30 to-black/20 backdrop-blur-md rounded-2xl border border-white/30 p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-4xl">🏆</span>
              总积分排行榜
            </h2>
            <p className="text-white/60 text-sm mt-2">所有用户累计积分排名</p>
          </div>
          <div className="w-full md:w-80">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 搜索用户昵称..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-5 py-3.5 bg-white/15 border-2 border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-300 hover:bg-white/20"
              />
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="group bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-2xl p-5 border-2 border-blue-400/40 hover:border-blue-400/60 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="text-white/70 text-sm font-medium">参与用户总数</div>
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-3xl font-bold text-blue-200 group-hover:text-blue-100 transition-colors">
              {rankStats.totalUsers} <span className="text-lg font-normal text-white/60">人</span>
            </div>
          </div>
          <div className="group bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-2xl p-5 border-2 border-green-400/40 hover:border-green-400/60 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-green-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="text-white/70 text-sm font-medium">总积分最高</div>
              <span className="text-2xl">⭐</span>
            </div>
            <div className="text-3xl font-bold text-green-200 group-hover:text-green-100 transition-colors">
              {rankStats.highestPoints.toFixed(1)} <span className="text-lg font-normal text-white/60">分</span>
            </div>
          </div>
          <div className="group bg-gradient-to-br from-yellow-500/30 to-orange-500/30 rounded-2xl p-5 border-2 border-yellow-400/40 hover:border-yellow-400/60 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-yellow-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="text-white/70 text-sm font-medium">平均作业数</div>
              <span className="text-2xl">📝</span>
            </div>
            <div className="text-3xl font-bold text-yellow-200 group-hover:text-yellow-100 transition-colors">
              {rankStats.avgHomework} <span className="text-lg font-normal text-white/60">个</span>
            </div>
          </div>
        </div>
      </div>

      {/* 排行列表 */}
      {rankLoading ? (
        <div className="text-center py-16 bg-gradient-to-br from-black/30 to-black/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-xl">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500/30 border-t-blue-500 mx-auto"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-blue-400/20"></div>
          </div>
          <p className="mt-6 text-white/80 text-lg font-medium">正在加载排行数据...</p>
          <p className="mt-2 text-white/50 text-sm">请稍候</p>
        </div>
      ) : currentRankList.length === 0 ? (
        <div className="text-center py-20 bg-gradient-to-br from-black/30 to-black/20 backdrop-blur-md rounded-2xl border border-white/30 shadow-xl">
          <div className="inline-block p-6 bg-white/10 rounded-full mb-6">
            <div className="text-7xl animate-bounce">📊</div>
          </div>
          <h3 className="text-white text-2xl font-bold mb-3">暂无排行数据</h3>
          <p className="text-white/60 text-base mb-4">
            {searchTerm ? '没有找到匹配的用户' : '还没有用户提交作业'}
          </p>
          {searchTerm && (
            <button
              onClick={() => handleSearchChange('')}
              className="mt-4 px-6 py-2.5 bg-blue-500/80 hover:bg-blue-500 text-white rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
            >
              清除搜索
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {currentRankList.map((item, index) => {
              let rankStyle = 'bg-gradient-to-r from-white/10 to-white/5 border-white/20';
              let rankIcon = `#${item.rank}`;
              let rankBg = 'bg-white/20';
              let shadowColor = '';

              if (item.rank === 1) {
                rankStyle =
                  'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-yellow-400/60';
                rankIcon = '🥇';
                rankBg = 'bg-gradient-to-br from-yellow-400 to-orange-400';
                shadowColor = 'shadow-yellow-500/30';
              } else if (item.rank === 2) {
                rankStyle =
                  'bg-gradient-to-r from-gray-300/30 to-gray-400/30 border-gray-300/60';
                rankIcon = '🥈';
                rankBg = 'bg-gradient-to-br from-gray-300 to-gray-400';
                shadowColor = 'shadow-gray-400/30';
              } else if (item.rank === 3) {
                rankStyle =
                  'bg-gradient-to-r from-orange-600/30 to-orange-700/30 border-orange-500/60';
                rankIcon = '🥉';
                rankBg = 'bg-gradient-to-br from-orange-500 to-orange-600';
                shadowColor = 'shadow-orange-500/30';
              }

              return (
                <div
                  key={item.id}
                  className={`${rankStyle} backdrop-blur-md rounded-2xl p-5 border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${shadowColor} group`}
                  style={{
                    animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`
                  }}
                >
                  <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
                    <div className="flex items-center space-x-4 w-full sm:w-auto">
                      <div className={`${rankBg} text-white w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                        {item.rank <= 3 ? rankIcon : `#${item.rank}`}
                      </div>
                      <div className="flex-1">
                        <div className="text-xl font-bold text-white group-hover:text-blue-200 transition-colors">
                          {item.nickname}
                        </div>
                        <div className="text-sm text-white/60 mt-1 flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            📚 {item.homeworkCount} 个作业
                          </span>
                          <span className="text-white/40">•</span>
                          <span className="inline-flex items-center gap-1">
                            🕐 {item.lastUpdated}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right w-full sm:w-auto bg-white/10 rounded-xl p-3 group-hover:bg-white/15 transition-colors">
                      <div className="text-2xl font-bold text-blue-200 group-hover:text-blue-100 transition-colors">
                        {item.totalPoints.toFixed(1)}
                        <span className="text-base font-normal text-white/50 ml-1">总积分</span>
                      </div>
                      <div className="text-sm text-white/50 mt-1">
                        平均 {(item.totalPoints / item.homeworkCount || 0).toFixed(1)} 分/作业
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 分页控件 */}
          {rankPagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 bg-gradient-to-br from-black/30 to-black/20 backdrop-blur-md rounded-2xl border border-white/30 p-5 shadow-xl">
              <button
                onClick={() => handleRankPageChange(rankPagination.page - 1)}
                disabled={rankPagination.page === 1}
                className="group px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 disabled:hover:scale-100 border border-white/20 font-medium"
              >
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  上一页
                </span>
              </button>
              
              <div className="px-6 py-2.5 bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-white rounded-xl border-2 border-blue-400/40 font-semibold min-w-[140px] text-center">
                <span className="text-blue-200">{rankPagination.page}</span>
                <span className="text-white/50 mx-2">/</span>
                <span className="text-white/70">{rankPagination.totalPages}</span>
              </div>
              
              <button
                onClick={() => handleRankPageChange(rankPagination.page + 1)}
                disabled={rankPagination.page === rankPagination.totalPages}
                className="group px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 disabled:hover:scale-100 border border-white/20 font-medium"
              >
                <span className="inline-flex items-center gap-2">
                  下一页
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

