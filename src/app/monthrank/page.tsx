import PointsLeaderboard from '@/components/PointsLeaderboard'
import Link from 'next/link'

export const metadata = {
  title: '月度积分榜 - EverSoul 作业系统',
  description: '查看玩家月度积分排行榜和奖池信息',
}

export default function MonthRankPage() {
  return (
    <main
      className="min-h-screen relative"
      style={{
        backgroundImage: 'url(/background/prizeBg.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* 半透明覆盖层 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* 页面标题和导航 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">
              月度积分榜
            </h1>
            <Link
              href="/"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-colors"
            >
              ← 返回首页
            </Link>
          </div>
          <p className="text-white/70">
            每月积分排行榜，完成19图及以上关卡作业可获得积分奖励
          </p>
        </div>

        {/* 排行榜组件 */}
        <PointsLeaderboard />
      </div>
    </main>
  )
}