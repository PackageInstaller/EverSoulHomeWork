'use client';

import { useState, useEffect } from 'react';
import { compressImage } from '@/utils/imageCompression';
import ImagePreviewModal from './ImagePreviewModal';

interface User {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
  pendingCount?: number; // 待审核作业数量
}

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

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userHomeworks, setUserHomeworks] = useState<Homework[]>([]);
  const [homeworksLoading, setHomeworksLoading] = useState(false);

  // 主标签页：用户信息、作业审核、消息发送
  const [activeTab, setActiveTab] = useState<'info' | 'homework' | 'message'>('homework');

  // 作业状态筛选
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  // 编辑用户模态框
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // 图片预览
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentHomeworkImages, setCurrentHomeworkImages] = useState<HomeworkImage[]>([]);

  // 批量操作
  const [selectedHomeworks, setSelectedHomeworks] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  // 拒绝作业模态框
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectHomeworkId, setRejectHomeworkId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isBatchReject, setIsBatchReject] = useState(false);


  // 消息发送
  const [selectedMessageUsers, setSelectedMessageUsers] = useState<Set<string>>(new Set());
  const [sendToAll, setSendToAll] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [messageImages, setMessageImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  // 定时刷新用户列表（包含待审核数量）
  useEffect(() => {
    // 只在用户管理页面且未选中用户时刷新
    if (!selectedUser) {
      const interval = setInterval(() => {
        if (!document.hidden) {
          fetchUsers(); // 刷新用户列表，包含待审核数量
        }
      }, 10000); // 每10秒刷新一次

      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const cacheBuster = Date.now();
      const response = await fetch(`/api/admin/users?includePendingCount=true&_t=${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };


  const fetchUserHomeworks = async (nickname: string) => {
    try {
      setHomeworksLoading(true);
      const cacheBuster = Date.now();
      // 使用管理员API获取所有状态的作业
      const response = await fetch(`/api/admin/homework?status=all&page=1&limit=1000&_t=${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      if (data.success) {
        // 筛选出该用户的作业
        const filteredHomeworks = data.homeworks.filter((hw: Homework) => hw.nickname === nickname);
        setUserHomeworks(filteredHomeworks);
      }
    } catch (error) {
      console.error('获取用户作业失败:', error);
    } finally {
      setHomeworksLoading(false);
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSelectedHomeworks(new Set()); // 清空选择
    if (activeTab === 'homework') {
      fetchUserHomeworks(user.nickname);
    }
  };

  const handleTabChange = (tab: 'info' | 'homework' | 'message') => {
    setActiveTab(tab);
    // 切换到作业审核标签时，刷新作业列表
    if (tab === 'homework') {
      if (selectedUser) {
        fetchUserHomeworks(selectedUser.nickname);
      }
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditNickname(user.nickname);
    setEditEmail(user.email);
    setEditPassword('');
    setEditModalOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    if (!editNickname.trim()) {
      alert('昵称不能为空');
      return;
    }

    if (editNickname.trim().length > 50) {
      alert('昵称长度不能超过50个字符');
      return;
    }

    if (!editEmail.trim()) {
      alert('邮箱不能为空');
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail.trim())) {
      alert('邮箱格式不正确');
      return;
    }

    try {
      setEditLoading(true);
      const updateData: { nickname?: string; email?: string; password?: string } = {};

      if (editNickname.trim() !== selectedUser.nickname) {
        updateData.nickname = editNickname.trim();
      }

      if (editEmail.trim() !== selectedUser.email) {
        updateData.email = editEmail.trim();
      }

      if (editPassword.trim()) {
        updateData.password = editPassword.trim();
      }

      if (Object.keys(updateData).length === 0) {
        alert('没有需要更新的内容');
        return;
      }

      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (data.success) {
        alert('用户信息更新成功');
        setEditModalOpen(false);
        fetchUsers();
        if (updateData.nickname || updateData.email) {
          // 如果昵称或邮箱被修改了，更新选中的用户
          setSelectedUser({ 
            ...selectedUser, 
            nickname: updateData.nickname || selectedUser.nickname,
            email: updateData.email || selectedUser.email
          });
          if (activeTab === 'homework' && updateData.nickname) {
            fetchUserHomeworks(updateData.nickname);
          }
        }
      } else {
        alert(data.message || '更新失败');
      }
    } catch (error) {
      alert('网络错误');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`确定要删除用户 "${user.nickname}" 吗？\n\n此操作将同时删除：\n• 该用户的所有作业\n• 该用户的所有积分记录\n• 该用户的所有消息\n\n此操作不可撤销！`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('用户删除成功');
        fetchUsers();
        if (selectedUser?.id === user.id) {
          setSelectedUser(null);
          setUserHomeworks([]);
        }
      } else {
        alert(data.message || '删除失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  // 作业状态变更
  const handleHomeworkStatusChange = async (homeworkId: string, newStatus: string) => {
    if (newStatus === 'rejected') {
      setRejectHomeworkId(homeworkId);
      setRejectModalOpen(true);
      return;
    }

    try {
      const response = await fetch(`/api/admin/homework/${homeworkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        alert(`作业状态已更新为: ${getStatusText(newStatus)}`);
        if (selectedUser) {
          fetchUserHomeworks(selectedUser.nickname);
        }
        fetchUsers(); // 刷新用户列表（包含待审核数量）
      } else {
        alert(data.error || '更新状态失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  // 确认拒绝作业
  const handleRejectConfirm = async () => {
    // 批量拒绝
    if (isBatchReject) {
      if (selectedHomeworks.size === 0) return;

      setBatchLoading(true);
      try {
        const promises = Array.from(selectedHomeworks).map((homeworkId) =>
          fetch(`/api/admin/homework/${homeworkId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'rejected',
              rejectReason: rejectReason.trim() || undefined
            }),
          })
        );

        const results = await Promise.all(promises);
        const successCount = results.filter((r) => r.ok).length;

        if (successCount === selectedHomeworks.size) {
          alert(`成功拒绝 ${successCount} 个作业` + (rejectReason.trim() ? '，已发送拒绝原因通知' : ''));
        } else {
          alert(`操作完成：成功 ${successCount} 个，失败 ${selectedHomeworks.size - successCount} 个`);
        }

        setSelectedHomeworks(new Set());
        setRejectModalOpen(false);
        setRejectReason('');
        setIsBatchReject(false);
        if (selectedUser) {
          fetchUserHomeworks(selectedUser.nickname);
        }
        fetchUsers(); // 刷新用户列表（包含待审核数量）
      } catch (error) {
        alert('批量拒绝失败');
      } finally {
        setBatchLoading(false);
      }
      return;
    }

    // 单个拒绝
    if (!rejectHomeworkId) return;

    try {
      const response = await fetch(`/api/admin/homework/${rejectHomeworkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'rejected',
          rejectReason: rejectReason.trim() || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('作业已拒绝' + (rejectReason.trim() ? '，已发送拒绝原因通知' : ''));
        setRejectModalOpen(false);
        setRejectHomeworkId(null);
        setRejectReason('');
        if (selectedUser) {
          fetchUserHomeworks(selectedUser.nickname);
        }
        fetchUsers(); // 刷新用户列表（包含待审核数量）
      } else {
        alert(data.error || '更新状态失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  // 删除作业
  const handleDeleteHomework = async (homeworkId: string) => {
    if (!confirm('确定要删除这个作业吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/homework/${homeworkId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('作业删除成功');
        if (selectedUser) {
          fetchUserHomeworks(selectedUser.nickname);
        }
        fetchUsers(); // 刷新用户列表（包含待审核数量）
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  // 批量更新状态
  const handleBatchUpdate = async (newStatus: string) => {
    if (selectedHomeworks.size === 0) {
      alert('请先选择要操作的作业');
      return;
    }

    // 如果是批量拒绝，打开拒绝原因弹窗
    if (newStatus === 'rejected') {
      setIsBatchReject(true);
      setRejectModalOpen(true);
      return;
    }

    if (!confirm(`确定要将选中的 ${selectedHomeworks.size} 个作业状态更新为 ${getStatusText(newStatus)} 吗？`)) {
      return;
    }

    setBatchLoading(true);
    try {
      const promises = Array.from(selectedHomeworks).map((homeworkId) =>
        fetch(`/api/admin/homework/${homeworkId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.ok).length;

      if (successCount === selectedHomeworks.size) {
        alert(`成功更新 ${successCount} 个作业`);
      } else {
        alert(`更新完成：成功 ${successCount} 个，失败 ${selectedHomeworks.size - successCount} 个`);
      }

      setSelectedHomeworks(new Set());
      if (selectedUser) {
        fetchUserHomeworks(selectedUser.nickname);
      }
      fetchUsers(); // 刷新用户列表（包含待审核数量）
    } catch (error) {
      alert('批量操作失败');
    } finally {
      setBatchLoading(false);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedHomeworks.size === 0) {
      alert('请先选择要删除的作业');
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedHomeworks.size} 个作业吗？此操作不可撤销！`)) {
      return;
    }

    setBatchLoading(true);
    try {
      const promises = Array.from(selectedHomeworks).map((homeworkId) =>
        fetch(`/api/admin/homework/${homeworkId}`, {
          method: 'DELETE',
        })
      );

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.ok).length;

      if (successCount === selectedHomeworks.size) {
        alert(`成功删除 ${successCount} 个作业`);
      } else {
        alert(`删除完成：成功 ${successCount} 个，失败 ${selectedHomeworks.size - successCount} 个`);
      }

      setSelectedHomeworks(new Set());
      if (selectedUser) {
        fetchUserHomeworks(selectedUser.nickname);
      }
      fetchUsers(); // 刷新用户列表（包含待审核数量）
    } catch (error) {
      alert('批量删除失败');
    } finally {
      setBatchLoading(false);
    }
  };

  // 消息发送
  const toggleMessageUser = (userId: string) => {
    const newSelected = new Set(selectedMessageUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
      // 如果取消选择了某个用户，取消全选模式
      if (sendToAll) {
        setSendToAll(false);
      }
    } else {
      newSelected.add(userId);
      // 如果手动选择了所有用户，自动切换到全选模式
      if (newSelected.size === users.length) {
        setSendToAll(true);
        setSelectedMessageUsers(new Set());
      }
    }
    setSelectedMessageUsers(newSelected);
  };

  const toggleSelectAllMessageUsers = () => {
    if (selectedMessageUsers.size === users.length) {
      setSelectedMessageUsers(new Set());
    } else {
      setSelectedMessageUsers(new Set(users.map(u => u.id)));
    }
  };

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // 验证文件类型
        if (!file.type.startsWith('image/')) {
          throw new Error(`${file.name} 不是图片文件`);
        }

        // 验证文件大小（最大10MB）
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name} 超过10MB限制`);
        }

        // 压缩图片（与作业上传相同的配置）
        const compressionResult = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.75,        // 75%质量
          targetSizeKB: 500,    // 超过500KB就压缩
          maxSizeKB: 10240,     // 最大10MB
          convertToWebP: true,  // 转换为WebP格式
          webpQuality: 0.75,    // WebP质量75%
        });

        const compressedFile = compressionResult.file;

        const formData = new FormData();
        formData.append('image', compressedFile);

        const response = await fetch('/api/admin/messages/upload-image', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (data.success) {
          return data.url;
        } else {
          throw new Error(data.message || '上传失败');
        }
      });

      const urls = await Promise.all(uploadPromises);
      setMessageImages([...messageImages, ...urls]);
    } catch (error: any) {
      alert('图片上传失败: ' + (error.message || '未知错误'));
    } finally {
      setUploadingImage(false);
      // 重置input，允许重复选择同一文件
      e.target.value = '';
    }
  };

  // 删除图片
  const handleRemoveImage = async (index: number) => {
    const imageUrl = messageImages[index];
    
    // 从状态中移除
    setMessageImages(messageImages.filter((_, i) => i !== index));

    // 调用API删除服务器上的文件
    try {
      const response = await fetch(`/api/admin/messages/delete-image?url=${encodeURIComponent(imageUrl)}`, {
        method: 'DELETE',
        credentials: 'include', // 包含 cookie
      });

      const data = await response.json();
      if (!data.success) {
        console.error('删除图片失败:', data.message);
      }
    } catch (error) {
      console.error('删除图片失败:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageTitle.trim() || !messageContent.trim()) {
      alert('请填写标题和内容');
      return;
    }

    if (!sendToAll && selectedMessageUsers.size === 0) {
      alert('请选择至少一个接收用户或选择发送给全体用户');
      return;
    }

    try {
      setSending(true);
      const response = await fetch('/api/admin/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: Array.from(selectedMessageUsers),
          title: messageTitle.trim(),
          content: messageContent.trim(),
          images: messageImages.length > 0 ? JSON.stringify(messageImages) : undefined,
          sendToAll,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`消息发送成功！已发送给 ${data.count} 位用户`);
        setMessageTitle('');
        setMessageContent('');
        setMessageImages([]);
        setSelectedMessageUsers(new Set());
        setSendToAll(false);
      } else {
        alert('发送失败: ' + data.message);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      alert('发送消息失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setSending(false);
    }
  };

  // 切换作业选中状态
  const toggleHomeworkSelection = (homeworkId: string) => {
    setSelectedHomeworks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(homeworkId)) {
        newSet.delete(homeworkId);
      } else {
        newSet.add(homeworkId);
      }
      return newSet;
    });
  };

  // 根据状态筛选作业
  const getFilteredHomeworks = () => {
    if (statusFilter === 'all') {
      return userHomeworks;
    }
    return userHomeworks.filter(hw => hw.status === statusFilter);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    const filteredHomeworks = getFilteredHomeworks();
    if (selectedHomeworks.size === filteredHomeworks.length && filteredHomeworks.length > 0) {
      setSelectedHomeworks(new Set());
    } else {
      setSelectedHomeworks(new Set(filteredHomeworks.map((hw) => hw.id)));
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

  const filteredHomeworks = getFilteredHomeworks();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：用户列表 */}
        <div className="lg:col-span-1">
          <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">用户列表</h2>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-white"></div>
                <p className="text-white/60 mt-4">加载中...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/60">暂无用户</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[700px] overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${selectedUser?.id === user.id
                        ? 'bg-blue-500/20 border-blue-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    onClick={() => handleSelectUser(user)}
                  >
                    <div className="flex items-center space-x-3">
                      {/* 用户头像（带红点提示） */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {user.nickname.charAt(0)}
                        </div>
                        {/* 红点：有待审核作业时显示 */}
                        {user.pendingCount !== undefined && user.pendingCount > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 items-center justify-center">
                              <span className="text-white text-xs font-bold">{user.pendingCount > 9 ? '9+' : user.pendingCount}</span>
                            </span>
                          </span>
                        )}
                      </div>
                      
                      {/* 用户信息 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate">{user.nickname}</h3>
                        <p className="text-white/60 text-sm truncate">{user.email}</p>
                        <p className="text-white/40 text-xs mt-1">
                          注册: {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：详细内容 */}
        <div className="lg:col-span-2">
          <div className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/20 p-6">
            {!selectedUser ? (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">👤</div>
                <p className="text-white/60 text-lg">请从左侧选择一个用户</p>
              </div>
            ) : (
              <>
                {/* 标签页切换 */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleTabChange('info')}
                      className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'info'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                    >
                      👤 用户信息
                    </button>
                    <button
                      onClick={() => handleTabChange('homework')}
                      className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'homework'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                    >
                      📝 作业审核
                    </button>
                    <button
                      onClick={() => handleTabChange('message')}
                      className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'message'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                    >
                      📬 发送消息
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditUser(selectedUser)}
                      className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-sm transition-colors"
                    >
                      ✏️ 编辑
                    </button>
                    <button
                      onClick={() => handleDeleteUser(selectedUser)}
                      className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition-colors"
                    >
                      🗑️ 删除
                    </button>
                  </div>
                </div>

                {/* 用户信息标签页 */}
                {activeTab === 'info' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white mb-4">用户详细信息</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <label className="text-white/60 text-sm">ID</label>
                        <p className="text-white font-medium break-all">{selectedUser.id}</p>
                      </div>

                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <label className="text-white/60 text-sm">昵称</label>
                        <p className="text-white font-medium">{selectedUser.nickname}</p>
                      </div>

                      <div className="bg-white/5 rounded-lg p-4 border border-white/10 col-span-2">
                        <label className="text-white/60 text-sm">邮箱</label>
                        <p className="text-white font-medium">{selectedUser.email}</p>
                      </div>

                      <div className="bg-white/5 rounded-lg p-4 border border-white/10 col-span-2">
                        <label className="text-white/60 text-sm">注册时间</label>
                        <p className="text-white font-medium">
                          {new Date(selectedUser.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 作业审核标签页 */}
                {activeTab === 'homework' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white">
                        {selectedUser.nickname} 的作业
                      </h3>
                      <span className="text-white/60 text-sm">
                        共 {userHomeworks.length} 个作业
                      </span>
                    </div>

                    {/* 状态筛选按钮 */}
                    <div className="flex items-center space-x-2 flex-wrap">
                      {[
                        { value: 'all' as const, label: '全部', count: userHomeworks.length },
                        { value: 'pending' as const, label: '待审核', count: userHomeworks.filter(hw => hw.status === 'pending').length },
                        { value: 'approved' as const, label: '已通过', count: userHomeworks.filter(hw => hw.status === 'approved').length },
                        { value: 'rejected' as const, label: '已拒绝', count: userHomeworks.filter(hw => hw.status === 'rejected').length },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setStatusFilter(option.value);
                            setSelectedHomeworks(new Set()); // 切换筛选时清空选择
                          }}
                          className={`px-3 py-1.5 rounded-lg transition-colors text-sm ${statusFilter === option.value
                              ? 'bg-blue-500 text-white'
                              : 'bg-white/10 text-white/70 hover:bg-white/20'
                            }`}
                        >
                          {option.label} ({option.count})
                        </button>
                      ))}
                    </div>

                    {/* 批量操作按钮 */}
                    {filteredHomeworks.length > 0 && (
                      <div className="flex items-center space-x-2 flex-wrap">
                        <button
                          onClick={toggleSelectAll}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
                        >
                          {selectedHomeworks.size === filteredHomeworks.length && filteredHomeworks.length > 0
                            ? '取消全选'
                            : '全选'}
                        </button>

                        {selectedHomeworks.size > 0 && (
                          <>
                            <span className="text-white/60 text-sm">
                              已选 {selectedHomeworks.size} 个
                            </span>

                            {/* 全部页面 */}
                            {statusFilter === 'all' && (
                              <>
                                <button
                                  onClick={() => handleBatchUpdate('approved')}
                                  disabled={batchLoading}
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white text-sm rounded-lg transition-colors"
                                >
                                  批量通过
                                </button>
                                <button
                                  onClick={() => handleBatchUpdate('rejected')}
                                  disabled={batchLoading}
                                  className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 text-white text-sm rounded-lg transition-colors"
                                >
                                  批量拒绝
                                </button>
                                <button
                                  onClick={() => handleBatchUpdate('pending')}
                                  disabled={batchLoading}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm rounded-lg transition-colors"
                                >
                                  批量待审核
                                </button>
                                <button
                                  onClick={handleBatchDelete}
                                  disabled={batchLoading}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white text-sm rounded-lg transition-colors"
                                >
                                  批量删除
                                </button>
                              </>
                            )}

                            {/* 待审核页面 */}
                            {statusFilter === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleBatchUpdate('approved')}
                                  disabled={batchLoading}
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white text-sm rounded-lg transition-colors"
                                >
                                  批量通过
                                </button>
                                <button
                                  onClick={() => handleBatchUpdate('rejected')}
                                  disabled={batchLoading}
                                  className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 text-white text-sm rounded-lg transition-colors"
                                >
                                  批量拒绝
                                </button>
                                <button
                                  onClick={handleBatchDelete}
                                  disabled={batchLoading}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white text-sm rounded-lg transition-colors"
                                >
                                  批量删除
                                </button>
                              </>
                            )}

                            {/* 已通过页面 */}
                            {statusFilter === 'approved' && (
                              <button
                                onClick={() => handleBatchUpdate('pending')}
                                disabled={batchLoading}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm rounded-lg transition-colors"
                              >
                                批量待审核
                              </button>
                            )}

                            {/* 已拒绝页面 */}
                            {statusFilter === 'rejected' && (
                              <>
                                <button
                                  onClick={() => handleBatchUpdate('approved')}
                                  disabled={batchLoading}
                                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white text-sm rounded-lg transition-colors"
                                >
                                  批量通过
                                </button>
                                <button
                                  onClick={handleBatchDelete}
                                  disabled={batchLoading}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white text-sm rounded-lg transition-colors"
                                >
                                  批量删除
                                </button>
                                <button
                                  onClick={() => handleBatchUpdate('pending')}
                                  disabled={batchLoading}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm rounded-lg transition-colors"
                                >
                                  批量恢复待审核
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {homeworksLoading ? (
                      <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-white"></div>
                        <p className="text-white/60 mt-4">加载作业中...</p>
                      </div>
                    ) : filteredHomeworks.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-white/60">
                          {statusFilter === 'all' ? '该用户还没有提交作业' : `没有${getStatusText(statusFilter)}的作业`}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto">
                        {filteredHomeworks.map((homework) => (
                          <div
                            key={homework.id}
                            className="bg-white/5 border border-white/10 rounded-lg p-4"
                          >
                            <div className="flex items-start space-x-3">
                              <input
                                type="checkbox"
                                checked={selectedHomeworks.has(homework.id)}
                                onChange={() => toggleHomeworkSelection(homework.id)}
                                className="mt-1 w-4 h-4 rounded cursor-pointer"
                              />
                              <div className="flex-1">
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                  <div>
                                    <label className="text-white/60 text-xs">关卡</label>
                                    <p className="text-white font-medium">{homework.stageId}</p>
                                  </div>
                                  <div>
                                    <label className="text-white/60 text-xs">状态</label>
                                    <p className={`inline-block px-2 py-1 rounded text-xs border ${getStatusColor(homework.status)}`}>
                                      {getStatusText(homework.status)}
                                    </p>
                                  </div>
                                </div>

                                {homework.description && (
                                  <div className="mb-3">
                                    <label className="text-white/60 text-xs">说明</label>
                                    <p className="text-white/80 text-sm">{homework.description}</p>
                                  </div>
                                )}

                                <div className="mb-3">
                                  <label className="text-white/60 text-xs block mb-2">
                                    图片 ({homework.images.length}张)
                                  </label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {homework.images.map((image, idx) => (
                                      <div key={image.id} className="relative group">
                                        <img
                                          src={image.url}
                                          alt={`图片${idx + 1}`}
                                          className="w-full h-16 object-cover rounded cursor-pointer hover:scale-105 transition-transform"
                                          onClick={() => {
                                            setCurrentHomeworkImages(homework.images);
                                            setCurrentImageIndex(idx);
                                            setSelectedImage(image.url);
                                          }}
                                        />
                                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1 rounded">
                                          {formatFileSize(image.fileSize)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="mb-3">
                                  <p className="text-white/50 text-xs">
                                    提交时间: {new Date(homework.createdAt).toLocaleString('zh-CN')}
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {homework.status === 'pending' && (
                                    <>
                                      <button
                                        onClick={() => handleHomeworkStatusChange(homework.id, 'approved')}
                                        className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded text-sm transition-colors"
                                      >
                                        ✓ 通过
                                      </button>
                                      <button
                                        onClick={() => handleHomeworkStatusChange(homework.id, 'rejected')}
                                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-sm transition-colors"
                                      >
                                        ✗ 拒绝
                                      </button>
                                    </>
                                  )}
                                  {homework.status !== 'pending' && (
                                    <button
                                      onClick={() => handleHomeworkStatusChange(homework.id, 'pending')}
                                      className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded text-sm transition-colors"
                                    >
                                      恢复待审核
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteHomework(homework.id)}
                                    className="px-3 py-1.5 bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 rounded text-sm transition-colors"
                                  >
                                    🗑️ 删除
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 消息发送标签页 */}
                {activeTab === 'message' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white mb-4">📬 发送消息</h3>

                    {/* 消息标题 */}
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        消息标题
                      </label>
                      <input
                        type="text"
                        value={messageTitle}
                        onChange={(e) => setMessageTitle(e.target.value)}
                        placeholder="请输入消息标题"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* 消息内容 */}
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        消息内容
                      </label>
                      <textarea
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        placeholder="请输入消息内容"
                        rows={6}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    {/* 图片上传 */}
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        图片附件（可选）
                      </label>
                      
                      {/* 图片预览 */}
                      {messageImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          {messageImages.map((url, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={url}
                                alt={`图片${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-white/20"
                              />
                              <button
                                onClick={() => handleRemoveImage(index)}
                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs transition-colors opacity-0 group-hover:opacity-100"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 上传按钮 */}
                      <div className="flex items-center space-x-2">
                        <label className={`px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                          uploadingImage
                            ? 'bg-gray-500 cursor-not-allowed'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}>
                          {uploadingImage ? '上传中...' : '📷 选择图片'}
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            multiple
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                            className="hidden"
                          />
                        </label>
                        <span className="text-white/50 text-xs">
                          支持 JPG、PNG、GIF、WEBP，单张最大10MB
                        </span>
                      </div>
                    </div>

                    {/* 接收用户选择 */}
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <label className="flex items-center text-white cursor-pointer mb-3">
                        <input
                          type="checkbox"
                          checked={sendToAll}
                          onChange={(e) => {
                            setSendToAll(e.target.checked);
                            if (e.target.checked) {
                              setSelectedMessageUsers(new Set());
                            }
                          }}
                          className="mr-2 w-4 h-4"
                        />
                        <span className="text-sm font-medium">发送给全体用户（共 {users.length} 人）</span>
                      </label>

                      {!sendToAll && (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-white/80 text-sm">选择接收用户:</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-white/60 text-sm">已选 {selectedMessageUsers.size} 人</span>
                              <button
                                onClick={toggleSelectAllMessageUsers}
                                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm rounded transition-colors"
                              >
                                {selectedMessageUsers.size === users.length ? '取消全选' : '全选'}
                              </button>
                            </div>
                          </div>
                          
                          {/* 用户列表 */}
                          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                            {users.map((user) => (
                              <label
                                key={user.id}
                                className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                                  selectedMessageUsers.has(user.id)
                                    ? 'bg-blue-500/20 border border-blue-500/50'
                                    : 'bg-white/5 hover:bg-white/10'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedMessageUsers.has(user.id)}
                                  onChange={() => toggleMessageUser(user.id)}
                                  className="w-4 h-4"
                                />
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                  {user.nickname.charAt(0)}
                                </div>
                                <span className="text-white text-sm truncate">{user.nickname}</span>
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* 发送按钮 */}
                    <button
                      onClick={handleSendMessage}
                      disabled={sending}
                      className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg transition-colors"
                    >
                      {sending ? '发送中...' : '发送消息'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 编辑用户模态框 */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditModalOpen(false)}
          />

          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              编辑用户
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  昵称
                </label>
                <input
                  type="text"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="请输入昵称"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  邮箱
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="请输入邮箱"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  新密码（不修改请留空）
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="留空则不修改密码"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditModalOpen(false)}
                disabled={editLoading}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 rounded-lg transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSaveUser}
                disabled={editLoading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium"
              >
                {editLoading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 图片预览模态框 */}
      {selectedImage && currentHomeworkImages.length > 0 && (
        <ImagePreviewModal
          images={currentHomeworkImages}
          currentIndex={currentImageIndex}
          onClose={() => {
            setSelectedImage(null);
            setCurrentHomeworkImages([]);
            setCurrentImageIndex(0);
          }}
          onIndexChange={(index) => {
            setCurrentImageIndex(index);
            setSelectedImage(currentHomeworkImages[index].url);
          }}
        />
      )}

      {/* 拒绝作业模态框 */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setRejectModalOpen(false);
              setRejectHomeworkId(null);
              setRejectReason('');
              setIsBatchReject(false);
            }}
          />

          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {isBatchReject ? `批量拒绝 (${selectedHomeworks.size}个)` : '拒绝作业'}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                拒绝原因（可选）
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入拒绝原因，如不填写则只拒绝不发送通知"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none text-gray-900 placeholder-gray-400"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                填写拒绝原因后，系统将发送邮件通知用户
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectHomeworkId(null);
                  setRejectReason('');
                  setIsBatchReject(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={batchLoading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors font-medium"
              >
                {batchLoading ? '处理中...' : '确认拒绝'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
