'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RejectedHomeworkList from '@/components/RejectedHomeworkList';

export default function RejectedHomeworksPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // 检查登录状态
    const token = localStorage.getItem('Token');
    if (!token) {
      router.push('/loginResignter');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-900 via-blue-900 to-black">
        <div className="text-white text-lg">验证登录状态...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-purple-900 via-blue-900 to-black">
      <div className="max-w-5xl mx-auto">
        {/* 头部导航 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold text-white">
              我的作业管理
            </h1>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回主页
            </button>
          </div>
          <p className="text-white/60 text-sm mt-2">
            查看您提交的所有作业，包括已通过和被拒绝的作业。被拒绝的作业可以重新编辑并提交。
          </p>
        </div>

        {/* 作业列表 */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
          <RejectedHomeworkList />
        </div>
      </div>
    </div>
  );
}

