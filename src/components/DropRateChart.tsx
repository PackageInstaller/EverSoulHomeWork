'use client';

import { DropItemInfo } from '@/types';

interface DropRateChartProps {
  dropItems: DropItemInfo[];
}

export default function DropRateChart({ dropItems }: DropRateChartProps) {
  const calculateExpectedValue = (rate: number, hours: number) => {
    // rate 是每分钟的概率（百分比形式）
    // 向下取整
    const probabilityPerMinute = rate / 100;
    // 计算指定小时数内的期望掉落次数
    const minutes = hours * 60;
    return Math.floor(probabilityPerMinute * minutes);
  };

  // 按概率排序
  const sortedItems = [...dropItems]
    .sort((a, b) => (b.rate || 0) - (a.rate || 0));
  const maxRate = Math.max(...sortedItems.map(item => item.rate || 0));
  const getRateColor = (rate: number) => {
    if (rate > 10) return { bg: 'bg-green-500', text: 'text-green-300', border: 'border-green-400' };
    if (rate > 1) return { bg: 'bg-blue-500', text: 'text-blue-300', border: 'border-blue-400' };
    if (rate > 0.1) return { bg: 'bg-yellow-500', text: 'text-yellow-300', border: 'border-yellow-400' };
    return { bg: 'bg-red-500', text: 'text-red-300', border: 'border-red-400' };
  };

  return (
    <div className="space-y-6">
      {/* 数学期望表格 */}
      <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/20">
        <h4 className="text-lg font-semibold text-white mb-3">掉落期望值计算</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-white/10">
                <th className="px-4 py-2 text-left text-sm font-semibold text-white/80">物品名称</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-white/80">每分钟概率</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-white/80">1小时期望</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-white/80">24小时期望</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item, index) => {
                const rate = item.rate || 0;
                const expected1h = calculateExpectedValue(rate, 1);
                const expected24h = calculateExpectedValue(rate, 24);
                const colors = getRateColor(rate);
                
                return (
                  <tr key={index} className="border-b border-white/20 hover:bg-white/5">
                    <td className="px-4 py-2 text-sm text-white">
                      {item.item_name?.zh_tw || '未知物品'}
                    </td>
                    <td className="px-4 py-2 text-sm text-center">
                      <span className={`font-medium ${colors.text}`}>
                        {rate.toFixed(3)}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-center text-white/70">
                      {expected1h}
                    </td>
                    <td className="px-4 py-2 text-sm text-center text-white/70">
                      {expected24h}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 