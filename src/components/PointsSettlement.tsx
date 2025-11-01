'use client';

import { useState, useEffect } from 'react';

interface SettlementResult {
  yearMonth: string;
  totalPoints: number;
  totalPool: number;
  distributed: number;
  nextCarryOver: number;
  rewards: Array<{
    nickname: string;
    points: number;
    reward: number;
  }>;
}

export default function PointsSettlement() {
  const [yearMonth, setYearMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SettlementResult | null>(null);
  const [availableMonths, setAvailableMonths] = useState<Array<{
    yearMonth: string;
    isSettled: boolean;
  }>>([]);

  // 基础奖池配置
  const [basePool, setBasePool] = useState(200);
  const [basePoolLoading, setBasePoolLoading] = useState(false);

  // 自动结算配置
  const [autoSettleHour, setAutoSettleHour] = useState(23); // 默认23点
  const [autoSettleLoading, setAutoSettleLoading] = useState(false);
  
  // 自动结算服务状态
  const [serviceStatus, setServiceStatus] = useState<any>(null);

  useEffect(() => {
    // 初始化为当前年月
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setYearMonth(currentYearMonth);

    // 获取可用月份列表
    fetchMonths();
    // 获取基础奖池配置
    fetchBasePool();
    // 获取自动结算配置
    fetchAutoSettleConfig();
    // 获取服务状态
    fetchServiceStatus();
  }, []);

  const fetchMonths = async () => {
    try {
      const cacheBuster = Date.now();
      const response = await fetch(`/api/points/months?_t=${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      if (data.success) {
        setAvailableMonths(data.months);
      }
    } catch (error) {
      console.error('获取月份列表失败:', error);
    }
  };

  const fetchBasePool = async () => {
    try {
      const cacheBuster = Date.now();
      const response = await fetch(`/api/points/base-pool?_t=${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      if (data.success) {
        setBasePool(data.basePool);
      }
    } catch (error) {
      console.error('获取基础奖池失败:', error);
    }
  };

  const fetchAutoSettleConfig = async () => {
    try {
      const response = await fetch('/api/admin/auto-settle/config', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      const data = await response.json();
      console.log('📖 [前端] 获取自动结算配置响应:', data);
      if (data.success) {
        console.log('📖 [前端] 设置 autoSettleHour 为:', data.config.autoSettleHour);
        setAutoSettleHour(data.config.autoSettleHour);
      }
    } catch (error) {
      console.error('❌ [前端] 获取自动结算配置失败:', error);
    }
  };

  const fetchServiceStatus = async () => {
    try {
      const cacheBuster = Date.now();
      const response = await fetch(`/api/admin/auto-settle/status?_t=${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();
      if (data.success) {
        setServiceStatus(data.status);
      }
    } catch (error) {
      console.error('❌ [前端] 获取服务状态失败:', error);
    }
  };

  const handleSettle = async () => {
    if (!yearMonth) {
      alert('❌ 请选择要结算的月份');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/points/settle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ yearMonth })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ 成功结算 ${yearMonth}！\n\n总积分：${data.result.totalPoints.toFixed(1)}\n总奖池：¥${data.result.totalPool}\n已发放：¥${data.result.distributed}\n累加到下月：¥${data.result.nextCarryOver}`);
        setResult(data.result);
        fetchMonths(); // 刷新月份列表
      } else {
        alert(`❌ 结算失败\n\n${data.message || '未知错误'}`);
      }
    } catch (error) {
      alert('❌ 结算请求失败，请重试');
      console.error('结算失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSettlement = async (month: string) => {
    if (!confirm(`⚠️ 确定要取消 ${month} 的结算吗？\n\n这将：\n• 清除该月的所有结算记录\n• 恢复所有用户的积分到月度奖池\n• 允许重新结算`)) {
      return;
    }

    try {
      const response = await fetch('/api/points/cancel-settlement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ yearMonth: month })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ 已取消 ${month} 的结算\n\n${data.message || '操作成功'}`);
        fetchMonths();
        if (result && result.yearMonth === month) {
          setResult(null);
        }
      } else {
        alert(`❌ 取消结算失败\n\n${data.message || data.error || '未知错误'}`);
      }
    } catch (error) {
      alert('❌ 取消结算请求失败');
      console.error('取消结算失败:', error);
    }
  };

  const handleUpdateBasePool = async () => {
    if (!confirm(`确认要将基础奖池金额设置为 ¥${basePool} 吗？`)) {
      return;
    }

    setBasePoolLoading(true);

    try {
      const response = await fetch('/api/points/base-pool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ basePool })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ 基础奖池已更新为 ¥${basePool}`);
        fetchBasePool();
      } else {
        alert(`❌ 更新失败\n\n${data.message || '未知错误'}`);
      }
    } catch (error) {
      alert('❌ 更新基础奖池失败');
      console.error('更新基础奖池失败:', error);
    } finally {
      setBasePoolLoading(false);
    }
  };

  const handleUpdateAutoSettle = async () => {
    if (!confirm(`确认要将自动结算时间设置为每月最后一天的 ${autoSettleHour}:00 吗？`)) {
      return;
    }

    setAutoSettleLoading(true);

    try {
      const response = await fetch('/api/admin/auto-settle/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          autoSettleHour
        })
      });

      const data = await response.json();

      if (data.success) {
        const savedValue = data.saved ? parseInt(data.saved.value) : autoSettleHour;
        setAutoSettleHour(savedValue);

        alert(`✅ 自动结算配置已更新`);
      } else {
        alert(`❌ 更新失败\n\n${data.message || '未知错误'}`);
      }
    } catch (error) {
      alert('❌ 更新自动结算配置失败');
      console.error('❌ [前端] 更新自动结算配置失败:', error);
    } finally {
      setAutoSettleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* PC端两列布局 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 左列：配置区 */}
        <div className="space-y-6">
          {/* 手动结算表单 */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">💰 手动结算</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-white/80 mb-2">选择结算月份</label>
                <div className="flex space-x-3">
                  <input
                    type="month"
                    value={yearMonth}
                    onChange={(e) => {
                      const value = e.target.value;
                      setYearMonth(value);
                    }}
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleSettle}
                    disabled={loading || !yearMonth}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white rounded-lg font-semibold transition-colors"
                  >
                    {loading ? '结算中...' : '执行结算'}
                  </button>
                </div>
              </div>

              {/* 提示信息 */}
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
                <p className="text-yellow-200 text-sm">
                  ⚠️ 注意：结算后可以在下方取消，但请谨慎操作！
                </p>
              </div>
            </div>
          </div>

          {/* 基础奖池配置 */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">🎁 基础奖池配置</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-white/80 mb-2">每月基础奖池金额（元）</label>
                <div className="flex space-x-3">
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={basePool}
                    onChange={(e) => setBasePool(Number(e.target.value))}
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleUpdateBasePool}
                    disabled={basePoolLoading}
                    className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white rounded-lg font-semibold transition-colors"
                  >
                    {basePoolLoading ? '保存中...' : '保存配置'}
                  </button>
                </div>
              </div>

              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
                <p className="text-blue-200 text-sm">
                  💡 提示：基础奖池金额将用于每月结算时的奖励计算
                </p>
              </div>
            </div>
          </div>

          {/* 自动结算配置 */}
          <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">⏰ 自动结算配置</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-white/80 mb-2">每月最后一天结算时间（小时）</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={autoSettleHour}
                  onChange={(e) => setAutoSettleHour(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="0-23"
                />
              </div>

              <button
                onClick={handleUpdateAutoSettle}
                disabled={autoSettleLoading}
                className="w-full px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-500 text-white rounded-lg font-semibold transition-colors"
              >
                {autoSettleLoading ? '保存中...' : '保存自动结算配置'}
              </button>

              <div className="bg-purple-500/20 border border-purple-500/50 rounded-lg p-3">
                <p className="text-purple-200 text-sm">
                  🤖 自动结算：系统将在每月最后一天的 {autoSettleHour}:00 自动执行结算
                </p>
                <p className="text-purple-200 text-sm mt-1">
                  📝 说明：结算后提交的作业，积分将计入总榜，但不计入当月奖池活动
                </p>
              </div>

              {/* 服务状态 */}
              {serviceStatus && (
                <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${serviceStatus.isRunning ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                    <span className="text-blue-200 text-sm font-medium">{serviceStatus.message}</span>
                  </div>
                  {serviceStatus.startTime && (
                    <p className="text-blue-200 text-xs">
                      定时器启动时间: {new Date(serviceStatus.startTime).toLocaleString('zh-CN')}
                    </p>
                  )}
                  {serviceStatus.lastCheckTime && (
                    <p className="text-blue-200 text-xs">
                      最后检查: {new Date(serviceStatus.lastCheckTime).toLocaleString('zh-CN')}
                    </p>
                  )}
                  <p className="text-blue-200 text-xs">
                    进程运行时长: {serviceStatus.processUptime}
                  </p>
                  {serviceStatus.debug && (
                    <p className="text-blue-300 text-xs opacity-70">
                      {serviceStatus.debug}
                    </p>
                  )}
                  <button
                    onClick={fetchServiceStatus}
                    className="mt-2 px-3 py-1 bg-blue-500/30 hover:bg-blue-500/50 text-blue-100 rounded text-xs transition-colors"
                  >
                    刷新状态
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右列：结果区 */}
        <div className="space-y-6">
          {/* 占位提示 */}
          {!result && availableMonths.length === 0 && (
            <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💰</div>
                <h3 className="text-xl font-bold text-white mb-2">结算管理</h3>
                <p className="text-white/60 text-sm">
                  执行结算后，结果将显示在这里
                </p>
              </div>
            </div>
          )}

          {/* 结算结果 */}
          {result && (
            <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4">📊 结算结果</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-white/60 text-sm">总积分</div>
                    <div className="text-white text-2xl font-bold">{result.totalPoints}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-white/60 text-sm">总奖池</div>
                    <div className="text-white text-2xl font-bold">¥{result.totalPool}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-white/60 text-sm">已发放</div>
                    <div className="text-green-400 text-2xl font-bold">¥{result.distributed}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-white/60 text-sm">下月累加</div>
                    <div className="text-yellow-400 text-2xl font-bold">¥{result.nextCarryOver}</div>
                  </div>
                </div>

                {/* 奖励明细 */}
                <div>
                  <h4 className="text-white font-semibold mb-2">💰 奖励明细</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {result.rewards.map((reward, index) => (
                      <div key={index} className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <span className="text-white/40 text-sm">#{index + 1}</span>
                          <span className="text-white font-medium">{reward.nickname}</span>
                          <span className="text-white/60 text-sm">{reward.points} 分</span>
                        </div>
                        <span className="text-green-400 font-semibold">¥{reward.reward.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 历史结算记录 */}
          {availableMonths.length > 0 && (
            <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4">📜 历史结算记录</h3>

              <div className="space-y-2">
                {availableMonths.map((month) => (
                  <div key={month.yearMonth} className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <span className="text-white font-medium">{month.yearMonth}</span>
                      {month.isSettled ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded">已结算</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded">未结算</span>
                      )}
                    </div>
                    {month.isSettled && (
                      <button
                        onClick={() => handleCancelSettlement(month.yearMonth)}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-sm transition-colors"
                      >
                        取消结算
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}