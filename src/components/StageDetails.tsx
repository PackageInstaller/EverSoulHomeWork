'use client';

import { StageDetails as StageDetailsType, BattleTeamInfo, DropItemInfo } from '@/types';
import DropRateChart from './DropRateChart';
import CashPackCard from './CashPackCard';
import HomeworkSection from './HomeworkSection';

interface StageDetailsProps {
  stageDetails: StageDetailsType;
  dataSource: 'Live' | 'Review';
}

export default function StageDetails({ stageDetails, dataSource }: StageDetailsProps) {
  const {
    area_no,
    stage_no,
    level_type,
    exp,
    fixed_items,
    battle_teams,
    drop_items,
    cash_packs
  } = stageDetails;



  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* 标题和基本信息 */}
      <div className="stage-card">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-white">
            关卡 {area_no}-{stage_no}
          </h1>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${dataSource === 'Live'
              ? 'bg-green-100 text-green-800'
              : 'bg-blue-100 text-blue-800'
              }`}>
              {dataSource === 'Live' ? '正式服' : '测试服'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-white/70">关卡类型：</span>
            <span className="font-semibold text-blue-200">
              {level_type || '普通关卡'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-white/70">经验值：</span>
            <span className="font-semibold text-green-200">
              {exp || 0}
            </span>
          </div>
        </div>
      </div>

      {/* 固定掉落物品 */}
      {fixed_items.length > 0 && (
        <div className="stage-card">
          <h2 className="text-xl font-bold text-white mb-4">
            固定掉落物品
          </h2>
          <div className="flex flex-wrap gap-2">
            {fixed_items.map((item, index) => (
              <div key={index} className="drop-item">
                {item.name} x{item.amount}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 敌方队伍信息 */}
      {battle_teams.length > 0 && (
        <div className="stage-card">
          <h2 className="text-xl font-bold text-white mb-4">
            敌方队伍信息
          </h2>
          <div className="space-y-4">
            {battle_teams.map((team) => (
              <BattleTeamCard key={team.team_no} team={team} />
            ))}
          </div>
        </div>
      )}



      {/* 掉落物品概率 */}
      {drop_items.length > 0 && (
        <div className="stage-card">
          <h2 className="text-xl font-bold text-white mb-4">掉落物品概率分析</h2>
          <DropRateChart dropItems={drop_items} />
        </div>
      )}

      {/* 通关礼包 */}
      {cash_packs.length > 0 && (
        <div className="stage-card">
          <h2 className="text-xl font-bold text-white mb-4">通关礼包</h2>
          <div className="space-y-4">
            {cash_packs.map((pack, index) => (
              <CashPackCard key={index} packInfo={pack} />
            ))}
          </div>
        </div>
      )}

      {/* 玩家作业分享 */}
      <HomeworkSection
        stageId={`${area_no}-${stage_no}`}
        teamCount={battle_teams.length}
      />
    </div>
  );
}

// 战斗队伍卡片组件
function BattleTeamCard({ team }: { team: BattleTeamInfo }) {
  return (
    <div className="battle-team-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">
          敌方队伍 {team.team_no}
        </h3>
        {team.battle_power && (
          <div className="text-sm text-white/70">
            战力: <span className="font-semibold text-red-600">{team.battle_power.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="mb-3">
        <span className="text-sm text-white/70">阵型：</span>
        <span className="text-sm font-medium">{team.formation_type}</span>
      </div>

      <div className="space-y-2">
        {team.heroes.map((hero) => (
          <div key={hero.position} className="flex items-center text-sm">
            <div className="hero-position">{hero.position}</div>
            <span className="font-medium text-white">{hero.name}</span>
            <span className="ml-2 text-white/70">{hero.grade}</span>
            <span className="ml-2 text-blue-600 font-medium">{hero.level}级</span>
          </div>
        ))}
      </div>
    </div>
  );
}

