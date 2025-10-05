'use client';

import { useState } from 'react';
import { getStageDetails } from '@/utils/dataUtils';
import { StageDetails, DataSource } from '@/types';

export default function TestStagePage() {
  const [stageDetails, setStageDetails] = useState<StageDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const testStage = async (dataSource: DataSource, areaNo: number, stageNo: number) => {
    setLoading(true);
    setError('');
    setStageDetails(null);

    try {
      console.log(`测试关卡: ${areaNo}-${stageNo}, 数据源: ${dataSource}`);
      const details = await getStageDetails(dataSource, areaNo, stageNo);
      setStageDetails(details);
      
      if (!details) {
        setError(`未找到关卡 ${areaNo}-${stageNo} 的信息`);
      }
    } catch (err) {
      setError(`加载失败: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">关卡详情测试</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => testStage('live', 1, 1)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          disabled={loading}
        >
          测试 1-1 (正式服)
        </button>
        <button
          onClick={() => testStage('live', 1, 2)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          disabled={loading}
        >
          测试 1-2 (正式服)
        </button>
        <button
          onClick={() => testStage('review', 1, 1)}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          disabled={loading}
        >
          测试 1-1 (测试服)
        </button>
        <button
          onClick={() => testStage('live', 2, 1)}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
          disabled={loading}
        >
          测试 2-1 (正式服)
        </button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="loading-spinner mx-auto"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {stageDetails && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">
            关卡 {stageDetails.area_no}-{stageDetails.stage_no} 详情
          </h2>
          
          <div className="space-y-4">
            <div>
              <strong>关卡类型:</strong> {stageDetails.level_type || '未知'}
            </div>
            <div>
              <strong>经验值:</strong> {stageDetails.exp}
            </div>
            
            {stageDetails.fixed_items.length > 0 && (
              <div>
                <strong>固定掉落物品:</strong>
                <ul className="list-disc list-inside mt-2">
                  {stageDetails.fixed_items.map((item, index) => (
                    <li key={index}>{item.name} x{item.amount}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {stageDetails.battle_teams.length > 0 && (
              <div>
                <strong>敌方队伍:</strong>
                <div className="mt-2 space-y-2">
                  {stageDetails.battle_teams.map((team) => (
                    <div key={team.team_no} className="bg-gray-100 p-3 rounded">
                      <div>队伍 {team.team_no} - 阵型: {team.formation_type}</div>
                      {team.battle_power && <div>战力: {team.battle_power.toLocaleString()}</div>}
                      <div className="mt-1">
                        {team.heroes.map((hero) => (
                          <div key={hero.position} className="text-sm">
                            位置{hero.position}: {hero.name} {hero.grade} {hero.level}级
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {stageDetails.drop_items.length > 0 && (
              <div>
                <strong>掉落物品概率:</strong>
                <ul className="list-disc list-inside mt-2">
                  {stageDetails.drop_items.map((item, index) => (
                    <li key={index}>
                      {item.item_name.zh_tw} ({item.rate.toFixed(3)}%)
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {stageDetails.cash_packs.length > 0 && (
              <div>
                <strong>通关礼包:</strong>
                <ul className="list-disc list-inside mt-2">
                  {stageDetails.cash_packs.map((pack, index) => (
                    <li key={index}>{pack}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 