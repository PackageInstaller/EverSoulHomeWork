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
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['system', 'admin']));

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

      if (filter === 'unread') {
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

  // 按消息类型分组
  const groupMessagesByType = () => {
    const grouped = new Map<string, Message[]>();
    messages.forEach(message => {
      const type = message.type;
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push(message);
    });
    return grouped;
  };

  // 切换类型展开/收起
  const toggleTypeExpanded = (type: string) => {
    setExpandedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  // 全部展开/收起
  const toggleExpandAll = () => {
    const grouped = groupMessagesByType();
    if (expandedTypes.size === grouped.size) {
      setExpandedTypes(new Set());
    } else {
      setExpandedTypes(new Set(Array.from(grouped.keys())));
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* 顶部导航 */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/20">
        <div className="mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">📬 我的邮箱</h1>
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
            <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
              {/* 筛选按钮 */}
              <div className="p-4 border-b border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                    >
                      全部
                    </button>
                    <button
                      onClick={() => setFilter('unread')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'unread'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                    >
                      未读 {unreadCount > 0 && `(${unreadCount})`}
                    </button>
                    <button
                      onClick={() => setFilter('read')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'read'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                    >
                      已读
                    </button>
                  </div>
                </div>

                {/* 全部展开/收起按钮 */}
                {messages.length > 0 && (
                  <button
                    onClick={toggleExpandAll}
                    className="w-full px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
                  >
                    {expandedTypes.size === groupMessagesByType().size ? "全部收起" : "全部展开"}
                  </button>
                )}
              </div>

              {/* 消息列表 - 按类型分组 */}
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-white/70">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    加载中...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center text-white/70">
                    <div className="text-4xl mb-2">📭</div>
                    暂无消息
                  </div>
                ) : (
                  <div className="space-y-2 p-2">
                    {Array.from(groupMessagesByType().entries()).map(([type, typeMessages]) => {
                      const isExpanded = expandedTypes.has(type);
                      const unreadInType = typeMessages.filter(m => !m.isRead).length;

                      return (
                        <div
                          key={type}
                          className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
                        >
                          {/* 类型头部 - 可点击展开/收起 */}
                          <div
                            className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors"
                            onClick={() => toggleTypeExpanded(type)}
                          >
                            <div className="flex items-center space-x-3">
                              {/* 展开/收起图标 */}
                              <div
                                className="text-white text-lg transition-transform duration-200"
                                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                              >
                                ▶
                              </div>

                              {/* 类型图标 */}
                              <div className="text-2xl">
                                {type === 'system' ? '🔔' : '👤'}
                              </div>

                              {/* 类型信息 */}
                              <div>
                                <h3 className="text-white font-bold">
                                  {getTypeLabel(type)}
                                </h3>
                                <p className="text-white/60 text-sm">
                                  共 {typeMessages.length} 条消息
                                  {unreadInType > 0 && (
                                    <span className="ml-2 text-yellow-300">
                                      • {unreadInType} 条未读
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* 展开的消息列表 */}
                          {isExpanded && (
                            <div className="border-t border-white/10">
                              {typeMessages.map((message, index) => (
                                <div
                                  key={message.id}
                                  onClick={() => handleMessageClick(message)}
                                  className={`p-4 cursor-pointer transition-colors ${index > 0 ? 'border-t border-white/5' : ''
                                    } ${selectedMessage?.id === message.id
                                      ? 'bg-blue-500/20'
                                      : 'hover:bg-white/5'
                                    } ${!message.isRead ? 'bg-yellow-500/10' : ''}`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <h3 className={`text-sm font-medium text-white ${!message.isRead ? 'font-bold' : 'text-white/80'}`}>
                                      {message.title}
                                    </h3>
                                    {!message.isRead && (
                                      <span className="text-red-400 text-xs font-bold ml-2 flex-shrink-0">未读</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-white/50">
                                    {new Date(message.createdAt).toLocaleString('zh-CN')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：消息详情 */}
          <div className="lg:col-span-2">
            <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              {selectedMessage ? (
                <>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-3xl">
                          {selectedMessage.type === 'system' ? '🔔' : '👤'}
                        </span>
                        <span className="px-3 py-1 rounded-lg text-sm font-medium bg-white/10 text-white">
                          {getTypeLabel(selectedMessage.type)}
                        </span>
                        {!selectedMessage.isRead && (
                          <span className="text-red-400 text-sm font-bold">未读</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteMessage(selectedMessage.id)}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors font-medium"
                      >
                        🗑️ 删除
                      </button>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {selectedMessage.title}
                    </h2>
                    <p className="text-sm text-white/50">
                      {new Date(selectedMessage.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="border-t border-white/10 pt-4 mt-4">
                    <p className="text-white/80 whitespace-pre-wrap leading-relaxed">
                      {selectedMessage.content}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-white/70">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-lg">请选择一条消息查看详情</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

