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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [result, setResult] = useState<SettlementResult | null>(null);
  const [availableMonths, setAvailableMonths] = useState<Array<{
    yearMonth: string;
    isSettled: boolean;
  }>>([]);
  
  // 基础奖池配置
  const [basePool, setBasePool] = useState(200);
  const [basePoolLoading, setBasePoolLoading] = useState(false);

  useEffect(() => {
    // 初始化为当前年月
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setYearMonth(currentYearMonth);
    
    // 获取可用月份列表
    fetchMonths();
    // 获取基础奖池配置
    fetchBasePool();
  }, []);

  const fetchMonths = async () => {
    try {
      const response = await fetch('/api/points/months');
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
      const response = await fetch('/api/points/base-pool');
      const data = await response.json();
      if (data.success) {
        setBasePool(data.basePool);
      }
    } catch (error) {
      console.error('获取基础奖池失败:', error);
    }
  };

  const handleSettle = async () => {
    if (!yearMonth) {
      setError('请选择要结算的月份');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
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
        setSuccess(`成功结算 ${yearMonth}！`);
        setResult(data.result);
        fetchMonths(); // 刷新月份列表
      } else {
        setError(data.message || '结算失败');
      }
    } catch (error) {
      setError('结算请求失败，请重试');
      console.error('结算失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSettlement = async (month: string) => {
    if (!confirm(`确定要取消 ${month} 的结算吗？这将清除该月的所有结算记录！`)) {
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
        setSuccess(`已取消 ${month} 的结算`);
        fetchMonths();
        if (result && result.yearMonth === month) {
          setResult(null);
        }
      } else {
        setError(data.message || '取消结算失败');
      }
    } catch (error) {
      setError('取消结算请求失败');
      console.error('取消结算失败:', error);
    }
  };

  const handleUpdateBasePool = async () => {
    setBasePoolLoading(true);
    setError('');
    setSuccess('');

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
        setSuccess('基础奖池已更新');
        fetchBasePool();
      } else {
        setError(data.message || '更新失败');
      }
    } catch (error) {
      setError('更新基础奖池失败');
      console.error('更新基础奖池失败:', error);
    } finally {
      setBasePoolLoading(false);
    }
  };

  return (
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

      {/* 消息提示 */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
          <p className="text-green-200">{success}</p>
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
  );
}