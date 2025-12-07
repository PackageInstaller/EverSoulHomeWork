'use client';

import { useState, useEffect } from 'react';
import UserHomeworkModal from './UserHomeworkModal';

interface LeaderboardEntry {
  rank: number;
  nickname: string;
  points: number;
  homeworkCount: number;
  estimatedReward: number;
  updatedAt: string;
}

interface PrizePool {
  basePool: number;
  carryOver: number;
  totalPool: number;
  isSettled: boolean;
  distributed: number;
  settledAt: string | null;
}

interface LeaderboardData {
  yearMonth: string;
  totalPoints: number;
  prizePool: PrizePool;
  leaderboard: LeaderboardEntry[];
}

interface PointsLeaderboardProps {
  initialYearMonth?: string;
}

export default function PointsLeaderboard({ initialYearMonth }: PointsLeaderboardProps) {
  // 如果没有传入初始月份，使用当前年月
  const getCurrentYearMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(initialYearMonth || getCurrentYearMonth());
  const [availableMonths, setAvailableMonths] = useState<Array<{
    yearMonth: string;
    isSettled: boolean;
  }>>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // 获取可用月份列表
  const fetchMonths = async () => {
    try {
      // 添加时间戳参数破坏缓存，并设置 no-cache
      const cacheBuster = Date.now();
      const response = await fetch(`/api/points/months?_t=${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const result = await response.json();

      if (result.success) {
        setAvailableMonths(result.months);

        // 如果没有选择月份，使用最新的月份或当前月份
        if (!selectedMonth) {
          if (result.months.length > 0) {
            setSelectedMonth(result.months[0].yearMonth);
          } else {
            // 如果没有任何月份记录，使用当前年月
            const now = new Date();
            const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            setSelectedMonth(currentYearMonth);
          }
        }
      }
    } catch (error) {
      console.error('获取月份列表失败:', error);
      // 发生错误时，使用当前年月
      if (!selectedMonth) {
        const now = new Date();
        const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setSelectedMonth(currentYearMonth);
      }
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const cacheBuster = Date.now();
      const url = selectedMonth
        ? `/api/points/leaderboard?yearMonth=${selectedMonth}&_t=${cacheBuster}`
        : `/api/points/leaderboard?_t=${cacheBuster}`;

      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const result = await response.json();

      if (result.success) {
        setData(result);
      } else {
        setError('获取排行榜失败');
      }
    } catch (error) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonths();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      fetchLeaderboard();
    }
  }, [selectedMonth]);

  if (loading) {
    return (
      <div className="stage-card">
        <h2 className="text-2xl font-bold text-white mb-4">💎 积分排行榜</h2>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-white/70">正在加载排行榜...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="stage-card">
        <h2 className="text-2xl font-bold text-white mb-4">💎 积分排行榜</h2>
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-300">{error || '加载失败'}</p>
        </div>
      </div>
    );
  }

  const { prizePool, leaderboard, totalPoints } = data;

  return (
    <div className="space-y-6">
      {/* 月份选择器 - 优化UI */}
      {availableMonths.length > 0 && (
        <div className="stage-card bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">📅</div>
              <div>
                <h3 className="text-lg font-bold text-white">历史记录</h3>
                <p className="text-white/60 text-sm">选择月份查看往期排行榜</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-white/80 text-sm font-medium">选择月份：</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2.5 bg-white/10 border-2 border-white/30 rounded-lg text-white font-medium focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all cursor-pointer hover:bg-white/15"
              >
                {availableMonths.map((month) => (
                  <option key={month.yearMonth} value={month.yearMonth} className="bg-gray-900">
                    {month.yearMonth} {month.isSettled ? '✅ 已结算' : '⏳ 进行中'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 奖池信息 */}
      <div className="stage-card">
        <h2 className="text-2xl font-bold text-white mb-4">
          💰 奖池信息 - {data.yearMonth}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-500/30">
            <div className="text-white/70 text-sm mb-1">基础奖池</div>
            <div className="text-2xl font-bold text-yellow-300">¥{prizePool.basePool}</div>
          </div>

          {prizePool.carryOver > 0 && (
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-500/30">
              <div className="text-white/70 text-sm mb-1">上月累加</div>
              <div className="text-2xl font-bold text-green-300">¥{prizePool.carryOver}</div>
            </div>
          )}

          <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-blue-500/30">
            <div className="text-white/70 text-sm mb-1">总奖池</div>
            <div className="text-2xl font-bold text-blue-300">¥{prizePool.totalPool}</div>
          </div>

          <div className="bg-gradient-to-br from-pink-500/20 to-red-500/20 rounded-xl p-4 border border-pink-500/30">
            <div className="text-white/70 text-sm mb-1">当月总积分</div>
            <div className="text-2xl font-bold text-pink-300">{totalPoints.toFixed(2)}</div>
          </div>
        </div>

        {/* 奖励规则说明 */}
        <div className="mt-4 bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
            <span>📋</span>
            <span>奖励规则</span>
          </h3>
          <ul className="text-white/70 text-sm space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">•</span>
              <span><strong className="text-white/90">积分计算：</strong>19图起，无作业图：单队0.1分，双队0.5分，三队1分；有作业图减半</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 font-bold">•</span>
              <span><strong className="text-white/90">总积分 &lt; {prizePool.totalPool}：</strong>按1:1发放，<strong className="text-yellow-300">剩余累加至下月</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 font-bold">•</span>
              <span><strong className="text-white/90">总积分 ≥ 总奖池：</strong>按比例分配，全部发放</span>
            </li>
          </ul>
        </div>

        {prizePool.isSettled && (
          <div className="mt-4 bg-green-500/20 border border-green-500/50 rounded-lg p-3">
            <p className="text-green-300 text-sm">
              ✅ 本月已于 {new Date(prizePool.settledAt!).toLocaleString('zh-CN')} 结算完成
              {prizePool.distributed > 0 && `，发放奖励 ¥${prizePool.distributed}`}
            </p>
          </div>
        )}
      </div>

      {/* 排行榜 */}
      <div className="stage-card">
        <h2 className="text-2xl font-bold text-white mb-4">🏆 排行榜</h2>

        {leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white/70">本月暂无积分记录</p>
            <p className="text-white/50 text-sm mt-2">快来提交作业，成为第一名吧！</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry) => {
              // 根据排名设置不同的样式和图标
              let rankStyle = 'bg-white/5';
              let rankIconType: 'image' | 'text' = 'text';
              let rankIconSrc = '';
              let rankText = `#${entry.rank}`;

              if (entry.rank === 1) {
                rankStyle = 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50';
                rankIconType = 'image';
                rankIconSrc = '/rank/sticker_WorldRaid_Behemoth_01.png';
              } else if (entry.rank === 2) {
                rankStyle = 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-2 border-gray-400/50';
                rankIconType = 'image';
                rankIconSrc = '/rank/sticker_WorldRaid_Behemoth_02.png';
              } else if (entry.rank === 3) {
                rankStyle = 'bg-gradient-to-r from-orange-400/20 to-orange-600/20 border-2 border-orange-400/50';
                rankIconType = 'image';
                rankIconSrc = '/rank/sticker_WorldRaid_Behemoth_03.png';
              } else if (entry.rank >= 4 && entry.rank <= 100) {
                rankIconType = 'image';
                rankIconSrc = '/rank/sticker_WorldRaid_Behemoth_04.png';
              } else {
                // 100名以外
                rankIconType = 'image';
                rankIconSrc = '/rank/sticker_WorldRaid_Behemoth_05.png';
              }

              return (
                <div
                  key={entry.nickname}
                  className={`${rankStyle} backdrop-blur-sm rounded-xl p-4 border border-white/10`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* 排名图标 */}
                      <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                        {rankIconType === 'image' ? (
                          <img
                            src={rankIconSrc}
                            alt={`排名${entry.rank}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white/80">
                            {rankText}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        {/* 头像 */}
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0">
                          {entry.nickname.charAt(0)}
                        </div>
                        <div>
                          <button
                            onClick={() => setSelectedUser(entry.nickname)}
                            className="text-lg font-semibold text-white hover:text-blue-300 transition-colors cursor-pointer text-left group"
                          >
                            <span className="group-hover:underline">{entry.nickname}</span>
                            <span className="ml-2 text-sm text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              查看作业 →
                            </span>
                          </button>
                          <div className="text-sm text-white/60">
                            共 {entry.homeworkCount} 个作业
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-bold text-blue-300">
                        {entry.points.toFixed(2)} 积分
                      </div>
                      {!prizePool.isSettled && entry.estimatedReward > 0 && (
                        <div className="text-sm text-green-300">
                          预估 ¥{entry.estimatedReward.toFixed(2)}
                        </div>
                      )}
                      {prizePool.isSettled && entry.estimatedReward > 0 && (
                        <div className="text-sm text-yellow-300 font-semibold">
                          奖励 ¥{entry.estimatedReward.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
