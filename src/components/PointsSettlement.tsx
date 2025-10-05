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

interface AutoSettlementConfig {
  id: string;
  enabled: boolean;
  dayOfMonth: number;
  hour: number;
  minute: number;
  lastSettledMonth: string | null;
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

  // 自动结算配置
  const [autoConfig, setAutoConfig] = useState<AutoSettlementConfig | null>(null);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoDay, setAutoDay] = useState(1);
  const [autoHour, setAutoHour] = useState(0);
  const [autoMinute, setAutoMinute] = useState(0);
  const [autoLoading, setAutoLoading] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<{
    isRunning: boolean;
    serverTime?: string;
    serverTimeLocal?: string;
  } | null>(null);
  
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
    // 获取自动结算配置
    fetchAutoConfig();
    // 获取基础奖池配置
    fetchBasePool();
    // 获取服务状态
    fetchServiceStatus();
    
    // 每30秒更新一次服务状态
    const statusInterval = setInterval(fetchServiceStatus, 30000);
    return () => clearInterval(statusInterval);
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

  const fetchAutoConfig = async () => {
    try {
      const response = await fetch('/api/points/auto-settlement-config');
      const data = await response.json();
      if (data.success && data.config) {
        setAutoConfig(data.config);
        setAutoEnabled(data.config.enabled);
        setAutoDay(data.config.dayOfMonth);
        setAutoHour(data.config.hour);
        setAutoMinute(data.config.minute);
      }
    } catch (error) {
      console.error('获取自动结算配置失败:', error);
    }
  };

  const fetchServiceStatus = async () => {
    try {
      const response = await fetch('/api/points/auto-settlement-status');
      const data = await response.json();
      if (data.success) {
        setServiceStatus(data.status);
      }
    } catch (error) {
      console.error('获取服务状态失败:', error);
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
      console.error('获取基础奖池配置失败:', error);
    }
  };

  const handleUpdateBasePool = async () => {
    if (basePool < 0 || basePool > 10000) {
      setError('基础奖池必须在0-10000之间');
      return;
    }

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
        setSuccess('基础奖池配置已更新');
        fetchBasePool();
      } else {
        setError(data.error || '更新失败');
      }
    } catch (error: any) {
      setError(error.message || '网络错误');
    } finally {
      setBasePoolLoading(false);
    }
  };

  const handleSettle = async () => {
    if (!yearMonth) {
      setError('请输入年月');
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
        setSuccess('结算成功！');
        setResult(data.result);
        fetchMonths(); // 刷新月份列表
      } else {
        setError(data.error || '结算失败');
      }
    } catch (error: any) {
      setError(error.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSettlement = async (monthToCancel: string) => {
    if (!confirm(`确定要取消 ${monthToCancel} 的结算吗？此操作会清除该月的结算数据。`)) {
      return;
    }

    try {
      const response = await fetch('/api/points/cancel-settlement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ yearMonth: monthToCancel })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('结算已取消');
        fetchMonths();
        setResult(null);
      } else {
        setError(data.error || '取消失败');
      }
    } catch (error: any) {
      setError(error.message || '网络错误');
    }
  };

  const handleUpdateAutoConfig = async () => {
    setAutoLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/points/auto-settlement-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enabled: autoEnabled,
          dayOfMonth: autoDay,
          hour: autoHour,
          minute: autoMinute
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('自动结算配置已更新');
        fetchAutoConfig();
        fetchServiceStatus();
      } else {
        setError(data.error || '更新失败');
      }
    } catch (error: any) {
      setError(error.message || '网络错误');
    } finally {
      setAutoLoading(false);
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
        <h3 className="text-xl font-bold text-white mb-4">💰 基础奖池配置</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-white/80 mb-2 text-sm">每月基础奖池金额（元）</label>
            <div className="flex space-x-3">
              <input
                type="number"
                min="0"
                max="10000"
                step="50"
                value={basePool}
                onChange={(e) => setBasePool(parseFloat(e.target.value))}
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
            <p className="text-blue-200 text-sm mb-2">
              💡 说明：
            </p>
            <ul className="text-blue-200 text-sm space-y-1 ml-4">
              <li>• 基础奖池是每月固定的奖励金额</li>
              <li>• 如果当月总积分不足基础奖池，剩余部分会累加到下月</li>
              <li>• 修改后，新创建的月份奖池将使用新的基础金额</li>
              <li>• 已创建的月份奖池不会自动更新</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 自动结算配置 */}
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">⏰ 自动结算配置</h3>
          {serviceStatus && (
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${serviceStatus.isRunning ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className={`text-sm ${serviceStatus.isRunning ? 'text-green-400' : 'text-red-400'}`}>
                {serviceStatus.isRunning ? '服务运行中' : '服务未运行'}
              </span>
            </div>
          )}
        </div>
        
        {serviceStatus && serviceStatus.serverTimeLocal && (
          <div className="mb-4 bg-white/5 rounded-lg p-3">
            <div className="text-white/60 text-xs mb-1">服务器当前时间</div>
            <div className="text-white font-mono text-sm">{serviceStatus.serverTimeLocal}</div>
          </div>
        )}
        
        <div className="space-y-4">
          {/* 启用开关 */}
          <div className="flex items-center justify-between">
            <label className="text-white/80">启用自动结算</label>
            <button
              onClick={() => setAutoEnabled(!autoEnabled)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                autoEnabled ? 'bg-green-500' : 'bg-gray-500'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  autoEnabled ? 'translate-x-8' : 'translate-x-1'
                }`}
              ></div>
            </button>
          </div>

          {/* 时间设置 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-white/80 mb-2 text-sm">每月几号结算</label>
              <input
                type="number"
                min="1"
                max="28"
                value={autoDay}
                onChange={(e) => setAutoDay(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-white/80 mb-2 text-sm">小时 (0-23)</label>
              <input
                type="number"
                min="0"
                max="23"
                value={autoHour}
                onChange={(e) => setAutoHour(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-white/80 mb-2 text-sm">分钟 (0-59)</label>
              <input
                type="number"
                min="0"
                max="59"
                value={autoMinute}
                onChange={(e) => setAutoMinute(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* 说明 */}
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
            <p className="text-blue-200 text-sm mb-2">
              📌 自动结算说明：
            </p>
            <ul className="text-blue-200 text-sm space-y-1 ml-4">
              <li>• 系统会在设定时间自动结算上个月的积分</li>
              <li>• 例如：设置为每月1号0点，会在1号自动结算上个月</li>
              <li>• 建议日期设置在1-5号，避免遗漏</li>
            </ul>
          </div>

          {autoConfig?.lastSettledMonth && (
            <div className="text-white/60 text-sm">
              上次自动结算：{autoConfig.lastSettledMonth}
            </div>
          )}

          <button
            onClick={handleUpdateAutoConfig}
            disabled={autoLoading}
            className="w-full px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white rounded-lg font-semibold transition-colors"
          >
            {autoLoading ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-300">❌ {error}</p>
        </div>
      )}

      {/* 成功信息 */}
      {success && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
          <p className="text-green-300">✅ {success}</p>
        </div>
      )}

      {/* 结算结果 */}
      {result && (
        <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
          <h3 className="text-xl font-bold text-white mb-4">
            结算结果 - {result.yearMonth}
          </h3>

          {/* 统计信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-500/20 rounded-lg p-4">
              <div className="text-white/70 text-sm">总积分</div>
              <div className="text-2xl font-bold text-blue-300">{result.totalPoints.toFixed(1)}</div>
            </div>
            <div className="bg-green-500/20 rounded-lg p-4">
              <div className="text-white/70 text-sm">总奖池</div>
              <div className="text-2xl font-bold text-green-300">¥{result.totalPool}</div>
            </div>
            <div className="bg-yellow-500/20 rounded-lg p-4">
              <div className="text-white/70 text-sm">已发放</div>
              <div className="text-2xl font-bold text-yellow-300">¥{result.distributed}</div>
            </div>
            <div className="bg-purple-500/20 rounded-lg p-4">
              <div className="text-white/70 text-sm">下月累加</div>
              <div className="text-2xl font-bold text-purple-300">¥{result.nextCarryOver}</div>
            </div>
          </div>

          {/* 奖励明细 */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-3">奖励明细</h4>
            <div className="space-y-2">
              {result.rewards.map((reward, index) => (
                <div
                  key={reward.nickname}
                  className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-white/60 font-mono w-8">#{index + 1}</div>
                    <div className="text-white font-medium">{reward.nickname}</div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="text-blue-300 text-sm">{reward.points.toFixed(1)} 积分</div>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <div className="text-yellow-300 font-bold text-lg">¥{reward.reward.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 已结算月份列表 */}
      {availableMonths.length > 0 && (
        <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
          <h3 className="text-xl font-bold text-white mb-4">📊 结算历史</h3>
          <div className="space-y-2">
            {availableMonths.map((month) => (
              <div
                key={month.yearMonth}
                className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10"
              >
                <div className="text-white font-medium">{month.yearMonth}</div>
                <div className="flex items-center space-x-3">
                  {month.isSettled ? (
                    <>
                      <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                        ✅ 已结算
                      </span>
                      <button
                        onClick={() => handleCancelSettlement(month.yearMonth)}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition-colors"
                      >
                        取消结算
                      </button>
                    </>
                  ) : (
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm">
                      ⏳ 进行中
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}