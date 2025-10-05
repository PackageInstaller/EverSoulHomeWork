'use client';

import { useState, useEffect } from 'react';

interface HomeworkImage {
  id: string;
  filename: string;
  originalName: string;
  order: number;
  fileSize: number;
  url: string;
}

interface Homework {
  id: string;
  stageId: string;
  nickname: string;
  description: string;
  teamCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  images: HomeworkImage[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminHomeworkPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 检查认证状态
  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth');
      const result = await response.json();
      if (result.success) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('认证检查失败:', error);
      setIsAuthenticated(false);
    }
  };

  // 登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (result.success) {
        setIsAuthenticated(true);
        setPassword('');
        fetchHomeworks();
      } else {
        setLoginError(result.message || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      setLoginError('网络错误，请重试');
    } finally {
      setLoginLoading(false);
    }
  };

  // 登出
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
      setIsAuthenticated(false);
      setHomeworks([]);
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  const fetchHomeworks = async (status = selectedStatus, page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/homework?status=${status}&page=${page}&limit=10`);
      
      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      
      const result = await response.json();

      if (result.success) {
        setHomeworks(result.homeworks);
        setPagination(result.pagination);
      } else {
        setError('获取作业列表失败');
      }
    } catch (error) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHomeworks();
    }
  }, [selectedStatus, isAuthenticated]);

  const handleStatusChange = async (homeworkId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/homework/${homeworkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      const result = await response.json();

      if (result.success) {
        // 刷新列表
        fetchHomeworks(selectedStatus, pagination.page);
        alert(`作业状态已更新为: ${getStatusText(newStatus)}`);
      } else {
        alert(result.error || '更新状态失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const handleDelete = async (homeworkId: string) => {
    if (!confirm('确定要删除这个作业吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/homework/${homeworkId}`, {
        method: 'DELETE'
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      const result = await response.json();

      if (result.success) {
        // 刷新列表
        fetchHomeworks(selectedStatus, pagination.page);
        alert('作业删除成功');
      } else {
        alert(result.error || '删除失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待审核';
      case 'approved': return '已通过';
      case 'rejected': return '已拒绝';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'approved': return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'rejected': return 'bg-red-500/20 text-red-300 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + 'MB';
  };

  // 如果未认证，显示登录表单
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">管理员登录</h1>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent password-input"
                placeholder="给我一首歌的时间"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                inputMode="text"
                lang="zh-CN"
                required
                disabled={loginLoading}
              />
            </div>
            
            {loginError && (
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded-lg p-3">
                {loginError}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent"
            >
              {loginLoading ? '登录中...' : '登录'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6 mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white mb-4">作业管理后台</h1>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              登出
            </button>
          </div>
          
          {/* 状态筛选 */}
          <div className="flex space-x-4">
            {[
              { value: 'pending', label: '待审核' },
              { value: 'approved', label: '已通过' },
              { value: 'rejected', label: '已拒绝' },
              { value: 'all', label: '全部' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setSelectedStatus(option.value)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedStatus === option.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 统计信息 */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-4 mb-6">
          <div className="text-white text-sm">
            共 {pagination.total} 个作业 • 第 {pagination.page} 页，共 {pagination.totalPages} 页
          </div>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* 加载状态 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-white/70">正在加载...</p>
          </div>
        ) : (
          /* 作业列表 */
          <div className="space-y-4">
            {homeworks.length === 0 ? (
              <div className="text-center py-12 bg-black/20 backdrop-blur-sm rounded-xl border border-white/20">
                <p className="text-white/70">暂无作业数据</p>
              </div>
            ) : (
              homeworks.map(homework => (
                <div key={homework.id} className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                  {/* 作业基本信息 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="text-white/60 text-sm">关卡</label>
                      <p className="text-white font-medium">{homework.stageId}</p>
                    </div>
                    <div>
                      <label className="text-white/60 text-sm">昵称</label>
                      <p className="text-white font-medium">{homework.nickname}</p>
                    </div>
                    <div>
                      <label className="text-white/60 text-sm">状态</label>
                      <p className={`inline-block px-2 py-1 rounded text-xs border ${getStatusColor(homework.status)}`}>
                        {getStatusText(homework.status)}
                      </p>
                    </div>
                    <div>
                      <label className="text-white/60 text-sm">提交时间</label>
                      <p className="text-white/80 text-sm">{new Date(homework.createdAt).toLocaleString('zh-CN')}</p>
                    </div>
                  </div>

                  {/* 作业描述 */}
                  {homework.description && (
                    <div className="mb-4">
                      <label className="text-white/60 text-sm">作业说明</label>
                      <p className="text-white/80 text-sm mt-1 leading-relaxed">{homework.description}</p>
                    </div>
                  )}

                  {/* 图片列表 */}
                  <div className="mb-4">
                    <label className="text-white/60 text-sm mb-2 block">作业图片 ({homework.images.length}张)</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {homework.images.map((image, index) => (
                        <div key={image.id} className="relative group">
                          <img
                            src={image.url}
                            alt={`图片${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg cursor-pointer transition-transform hover:scale-105"
                            onClick={() => setSelectedImage(image.url)}
                          />
                          <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1 rounded">
                            {formatFileSize(image.fileSize)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex space-x-3">
                    {homework.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(homework.id, 'approved')}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                          ✓ 通过
                        </button>
                        <button
                          onClick={() => handleStatusChange(homework.id, 'rejected')}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                          ✗ 拒绝
                        </button>
                      </>
                    )}
                    {homework.status !== 'pending' && (
                      <button
                        onClick={() => handleStatusChange(homework.id, 'pending')}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        恢复待审核
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(homework.id)}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      🗑️ 删除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 分页 */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex justify-center space-x-2 mt-6">
            <button
              onClick={() => fetchHomeworks(selectedStatus, pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-white/10 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
            >
              上一页
            </button>
            <span className="px-4 py-2 text-white">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchHomeworks(selectedStatus, pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 bg-white/10 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
            >
              下一页
            </button>
          </div>
        )}

        {/* 图片预览模态框 */}
        {selectedImage && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
              <img
                src={selectedImage}
                alt="作业预览"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 