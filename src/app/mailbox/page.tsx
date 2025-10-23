'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Message {
  id: string;
  type: 'system' | 'admin';
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export default function MailboxPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'system' | 'admin' | 'unread' | 'read'>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useEffect(() => {
    fetchMessages();
  }, [filter]);

  const fetchMessages = async () => {
    const token = localStorage.getItem('Token');
    if (!token) {
      router.push('/loginResignter');
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filter === 'system' || filter === 'admin') {
        params.append('type', filter);
      } else if (filter === 'unread') {
        params.append('type', 'unread');
      } else if (filter === 'read') {
        params.append('type', 'read');
      }
      
      // 添加时间戳防止 CDN 缓存
      params.append('_t', Date.now().toString());

      const response = await fetch(`/api/messages?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      const data = await response.json();

      if (data.success) {
        setMessages(data.messages);
        setUnreadCount(data.unreadCount);
      } else {
        alert('获取消息失败');
      }
    } catch (error) {
      console.error('获取消息失败:', error);
      alert('获取消息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleMessageClick = async (message: Message) => {
    // 如果点击的是已选中的消息，则收起
    if (selectedMessage?.id === message.id) {
      setSelectedMessage(null);
      return;
    }

    setSelectedMessage(message);

    // 如果消息未读，标记为已读
    if (!message.isRead) {
      const token = localStorage.getItem('Token');
      if (!token) return;

      try {
        await fetch(`/api/messages/${message.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        // 更新本地状态
        setMessages(messages.map(m => 
          m.id === message.id ? { ...m, isRead: true } : m
        ));
        setUnreadCount(Math.max(0, unreadCount - 1));
      } catch (error) {
        console.error('标记已读失败:', error);
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('确定要删除这条消息吗？')) return;

    const token = localStorage.getItem('Token');
    if (!token) return;

    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setMessages(messages.filter(m => m.id !== messageId));
        if (selectedMessage?.id === messageId) {
          setSelectedMessage(null);
        }
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error('删除消息失败:', error);
      alert('删除失败');
    }
  };

  const getTypeLabel = (type: string) => {
    return type === 'system' ? '系统消息' : '管理员消息';
  };

  const getTypeColor = (type: string) => {
    return type === 'system' 
      ? 'bg-blue-100 text-blue-700'
      : 'bg-purple-100 text-purple-700';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">📬 我的邮箱</h1>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              ← 返回首页
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：消息列表 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* 筛选按钮 */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    全部
                  </button>
                  <button
                    onClick={() => setFilter('unread')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === 'unread'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    未读 {unreadCount > 0 && `(${unreadCount})`}
                  </button>
                  <button
                    onClick={() => setFilter('read')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === 'read'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    已读
                  </button>
                  <button
                    onClick={() => setFilter('system')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === 'system'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    系统
                  </button>
                  <button
                    onClick={() => setFilter('admin')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === 'admin'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    管理员
                  </button>
                </div>
              </div>

              {/* 消息列表 */}
              <div className="divide-y divide-gray-200 max-h-[calc(100vh-300px)] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">加载中...</div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">暂无消息</div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => handleMessageClick(message)}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedMessage?.id === message.id
                          ? 'bg-blue-50'
                          : 'hover:bg-gray-50'
                      } ${!message.isRead ? 'bg-yellow-50' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(message.type)}`}>
                          {getTypeLabel(message.type)}
                        </span>
                        {!message.isRead && (
                          <span className="text-red-500 text-xs font-bold">未读</span>
                        )}
                      </div>
                      <h3 className={`text-sm font-medium text-gray-900 ${!message.isRead ? 'font-bold' : ''}`}>
                        {message.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(message.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 右侧：消息详情 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              {selectedMessage ? (
                <>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 rounded text-sm font-medium ${getTypeColor(selectedMessage.type)}`}>
                        {getTypeLabel(selectedMessage.type)}
                      </span>
                      <button
                        onClick={() => handleDeleteMessage(selectedMessage.id)}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
                      >
                        🗑️ 删除
                      </button>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedMessage.title}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {new Date(selectedMessage.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedMessage.content}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-gray-500">
                  <div className="text-6xl mb-4">📭</div>
                  <p>请选择一条消息查看详情</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

