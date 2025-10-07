'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginRegisterPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // 添加状态来控制加载和成功提示
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      // 登录逻辑
      console.log('登录信息:', { email, password });
      
      // 模拟登录成功后的处理
      // 在实际应用中，这里应该调用后端API验证用户凭证
      if (email && password) {
        // 设置加载状态
        setLoading(true);
        
        // 模拟网络请求延迟
        setTimeout(() => {
          // 创建模拟token（实际项目中应由后端返回）
          const token = btoa(`${email}:${password}`);
          
          // 将token存储到localStorage中
          localStorage.setItem('Token', token);
          
          // 设置成功状态
          setLoading(false);
          setSuccess(true);
          
          // 延迟跳转以显示成功提示
          setTimeout(() => {
            // 跳转到首页
            router.push('/');
          }, 500);
        }, 1000);
      }
    } else {
      // 注册逻辑
      if (password !== confirmPassword) {
        alert('两次密码不一致！请重新输入');
        return;
      }
      console.log('注册信息:', { email, password });
      
      // 模拟注册成功后的处理
      // 实际项目中这里应该调用后端注册接口
      if (email && password) {
        // 设置加载状态
        setLoading(true);
        
        // 模拟网络请求延迟
        setTimeout(() => {
          // 注册成功后自动登录
          const token = btoa(`${email}:${password}`);
          localStorage.setItem('Token', token);
          
          // 设置成功状态
          setLoading(false);
          setSuccess(true);
          
          // 延迟跳转以显示成功提示
          setTimeout(() => {
            router.push('/');
          }, 500);
        }, 1000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-extrabold text-gray-900">
            EverSoul 作业站
          </h1>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            {isLogin ? '登录您的账户' : '创建新账户'}
          </h2>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`flex-1 py-2 px-4 text-center font-medium ${
                isLogin 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setIsLogin(true)}
            >
              登录
            </button>
            <button
              className={`flex-1 py-2 px-4 text-center font-medium ${
                !isLogin 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setIsLogin(false)}
            >
              注册
            </button>
          </div>

          {/* 添加成功提示 */}
          {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-center">
              {isLogin ? '登录成功！正在跳转...' : '注册成功！正在跳转...'}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                邮箱地址
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  确认密码
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={loading}
              >
                {/* 根据状态显示不同内容 */}
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    处理中...
                  </span>
                ) : (
                  <span>{isLogin ? '登录' : '注册'}</span>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}