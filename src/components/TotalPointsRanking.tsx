'use client';

import { useState, useEffect } from 'react';
import UserHomeworkModal from './UserHomeworkModal';

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
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

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
    <div className="space-y-6 p-4 md:p-6 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 标题和搜索 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-4xl">🏆</span>
              总积分排行榜
            </h2>
            <p className="text-gray-600 text-sm mt-2">所有用户累计积分排名</p>
          </div>
          <div className="w-full md:w-80">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 搜索用户昵称..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:bg-gray-100"
              />
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="group bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border-2 border-blue-200 hover:border-blue-300 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600 text-sm font-medium">参与用户总数</div>
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-3xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
              {rankStats.totalUsers} <span className="text-lg font-normal text-gray-500">人</span>
            </div>
          </div>
          <div className="group bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-5 border-2 border-green-200 hover:border-green-300 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-green-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600 text-sm font-medium">总积分最高</div>
              <span className="text-2xl">⭐</span>
            </div>
            <div className="text-3xl font-bold text-green-600 group-hover:text-green-700 transition-colors">
              {rankStats.highestPoints.toFixed(1)} <span className="text-lg font-normal text-gray-500">分</span>
            </div>
          </div>
          <div className="group bg-gradient-to-br from-yellow-50 to-orange-100 rounded-2xl p-5 border-2 border-yellow-200 hover:border-yellow-300 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-yellow-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-600 text-sm font-medium">平均作业数</div>
              <span className="text-2xl">📝</span>
            </div>
            <div className="text-3xl font-bold text-yellow-600 group-hover:text-yellow-700 transition-colors">
              {rankStats.avgHomework} <span className="text-lg font-normal text-gray-500">个</span>
            </div>
          </div>
        </div>

        {/* 积分规则说明 */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-5 border-2 border-blue-200">
          <h3 className="text-gray-900 font-bold mb-3 flex items-center gap-2">
            <span className="text-xl">📋</span>
            积分规则
          </h3>
          <ul className="text-gray-700 text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>19图起，每个无作业的图：单队0.1分，双队0.5分，三队1分</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>有作业的图按减半积分计算</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 排行列表 */}
      {rankLoading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-lg">
          <div className="relative inline-block">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-blue-100"></div>
          </div>
          <p className="mt-6 text-gray-700 text-lg font-medium">正在加载排行数据...</p>
          <p className="mt-2 text-gray-500 text-sm">请稍候</p>
        </div>
      ) : currentRankList.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-lg">
          <div className="inline-block p-6 bg-gray-50 rounded-full mb-6">
            <div className="text-7xl animate-bounce">📊</div>
          </div>
          <h3 className="text-gray-900 text-2xl font-bold mb-3">暂无排行数据</h3>
          <p className="text-gray-600 text-base mb-4">
            {searchTerm ? '没有找到匹配的用户' : '还没有用户提交作业'}
          </p>
          {searchTerm && (
            <button
              onClick={() => handleSearchChange('')}
              className="mt-4 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
            >
              清除搜索
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {currentRankList.map((item, index) => {
              let rankStyle = 'bg-white border-gray-200';
              let rankIcon = `#${item.rank}`;
              let rankBg = 'bg-gray-200';
              let shadowColor = 'shadow-lg';

              if (item.rank === 1) {
                rankStyle =
                  'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300';
                rankIcon = '🥇';
                rankBg = 'bg-gradient-to-br from-yellow-400 to-orange-400';
                shadowColor = 'shadow-xl shadow-yellow-500/20';
              } else if (item.rank === 2) {
                rankStyle =
                  'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300';
                rankIcon = '🥈';
                rankBg = 'bg-gradient-to-br from-gray-300 to-gray-400';
                shadowColor = 'shadow-xl shadow-gray-400/20';
              } else if (item.rank === 3) {
                rankStyle =
                  'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300';
                rankIcon = '🥉';
                rankBg = 'bg-gradient-to-br from-orange-500 to-orange-600';
                shadowColor = 'shadow-xl shadow-orange-500/20';
              }

              return (
                <div
                  key={item.id}
                  className={`${rankStyle} rounded-2xl p-5 border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${shadowColor} group`}
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
                        <button
                          onClick={() => setSelectedUser(item.nickname)}
                          className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer text-left group/name"
                        >
                          <span className="group-hover/name:underline">{item.nickname}</span>
                          <span className="ml-2 text-sm text-blue-500 opacity-0 group-hover/name:opacity-100 transition-opacity">
                            查看作业 →
                          </span>
                        </button>
                        <div className="text-sm text-gray-600 mt-1 flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            📚 {item.homeworkCount} 个作业
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="inline-flex items-center gap-1">
                            🕐 {item.lastUpdated}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right w-full sm:w-auto bg-gray-50 rounded-xl p-3 group-hover:bg-gray-100 transition-colors">
                      <div className="text-2xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                        {item.totalPoints.toFixed(1)}
                        <span className="text-base font-normal text-gray-500 ml-1">总积分</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
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
            <div className="flex justify-center items-center gap-3 bg-white rounded-2xl border border-gray-200 p-5 shadow-lg">
              <button
                onClick={() => handleRankPageChange(rankPagination.page - 1)}
                disabled={rankPagination.page === 1}
                className="group px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 disabled:hover:scale-100 border border-gray-300 font-medium"
              >
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  上一页
                </span>
              </button>
              
              <div className="px-6 py-2.5 bg-gradient-to-r from-blue-100 to-purple-100 text-gray-900 rounded-xl border-2 border-blue-300 font-semibold min-w-[140px] text-center">
                <span className="text-blue-600">{rankPagination.page}</span>
                <span className="text-gray-400 mx-2">/</span>
                <span className="text-gray-600">{rankPagination.totalPages}</span>
              </div>
              
              <button
                onClick={() => handleRankPageChange(rankPagination.page + 1)}
                disabled={rankPagination.page === rankPagination.totalPages}
                className="group px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 disabled:hover:scale-100 border border-gray-300 font-medium"
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

      {/* 玩家作业详情模态框 */}
      {selectedUser && (
        <UserHomeworkModal
          nickname={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}

