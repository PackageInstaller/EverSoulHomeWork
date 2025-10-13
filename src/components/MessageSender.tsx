'use client';

import { useState, useEffect } from 'react';
import { createHash } from 'crypto';

interface User {
  id: string;
  nickname: string;
  email: string;
}

export default function MessageSender() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [sendToAll, setSendToAll] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const adminPassword = document.cookie
        .split('; ')
        .find(row => row.startsWith('admin_session='))
        ?.split('=')[1];

      if (!adminPassword) {
        alert('管理员会话已过期');
        return;
      }

      const decoded = Buffer.from(adminPassword, 'base64').toString();
      const password = decoded.split(':')[0];

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${password}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
      } else {
        alert('获取用户列表失败');
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      alert('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) {
      alert('请填写标题和内容');
      return;
    }

    if (!sendToAll && selectedUsers.size === 0) {
      alert('请选择至少一个接收用户或选择发送给全体用户');
      return;
    }

    try {
      setSending(true);
      const adminPassword = document.cookie
        .split('; ')
        .find(row => row.startsWith('admin_session='))
        ?.split('=')[1];

      if (!adminPassword) {
        alert('管理员会话已过期');
        return;
      }

      const decoded = Buffer.from(adminPassword, 'base64').toString();
      const password = decoded.split(':')[0];

      const response = await fetch('/api/admin/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`,
        },
        body: JSON.stringify({
          userIds: Array.from(selectedUsers),
          title: title.trim(),
          content: content.trim(),
          sendToAll,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`消息发送成功！已发送给 ${data.count} 位用户`);
        setTitle('');
        setContent('');
        setSelectedUsers(new Set());
        setSendToAll(false);
      } else {
        alert('发送失败: ' + data.message);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      alert('发送消息失败');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 消息表单 */}
      <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
        <h2 className="text-2xl font-bold text-white mb-6">📬 发送消息给用户</h2>

        {/* 标题输入 */}
        <div className="mb-4">
          <label className="block text-white text-sm font-medium mb-2">
            消息标题
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入消息标题"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 内容输入 */}
        <div className="mb-4">
          <label className="block text-white text-sm font-medium mb-2">
            消息内容
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="请输入消息内容"
            rows={5}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* 发送给全体用户选项 */}
        <div className="mb-6">
          <label className="flex items-center text-white cursor-pointer">
            <input
              type="checkbox"
              checked={sendToAll}
              onChange={(e) => {
                setSendToAll(e.target.checked);
                if (e.target.checked) {
                  setSelectedUsers(new Set());
                }
              }}
              className="mr-2 w-4 h-4"
            />
            <span className="text-sm font-medium">发送给全体用户</span>
          </label>
        </div>

        {/* 发送按钮 */}
        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg transition-colors"
        >
          {sending ? '发送中...' : '发送消息'}
        </button>
      </div>

      {/* 用户列表 */}
      {!sendToAll && (
        <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">选择接收用户</h3>
            <div className="flex items-center gap-3">
              <span className="text-white/70 text-sm">
                已选择 {selectedUsers.size} / {users.length} 位用户
              </span>
              <button
                onClick={toggleSelectAll}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
              >
                {selectedUsers.size === users.length ? '取消全选' : '全选'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-white/70">加载中...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {users.map((user) => (
                <label
                  key={user.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedUsers.has(user.id)
                      ? 'bg-blue-500/30 border border-blue-400'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.id)}
                    onChange={() => toggleUser(user.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">
                      {user.nickname}
                    </div>
                    <div className="text-white/50 text-xs truncate">
                      {user.email}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

