import { Suspense } from 'react';
import StageListContent from '@/components/StageListContent';

export default function StageListPage() {
  return (
    <Suspense fallback={<StageListSkeleton />}>
      <StageListContent />
    </Suspense>
  );
}

function StageListSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">正在加载关卡数据...</p>
      </div>
    </div>
  );
} 