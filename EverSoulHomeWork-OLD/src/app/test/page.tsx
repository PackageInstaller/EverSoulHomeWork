'use client';

import { useState } from 'react';
import { fetchJsonFromGitHub } from '@/utils/dataUtils';

export default function TestPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testFetch = async () => {
    setLoading(true);
    setResult('开始测试...\n');
    
    try {
      // 测试获取 Stage 数据
      const stageData = await fetchJsonFromGitHub('live', 'Stage');
      setResult(prev => prev + `Stage 数据获取成功，类型: ${Array.isArray(stageData) ? '数组' : typeof stageData}\n`);
      
      if (Array.isArray(stageData)) {
        setResult(prev => prev + `Stage 数据长度: ${stageData.length}\n`);
        if (stageData.length > 0) {
          setResult(prev => prev + `第一个关卡: ${JSON.stringify(stageData[0], null, 2)}\n`);
        }
      } else {
        setResult(prev => prev + `Stage 数据结构: ${JSON.stringify(stageData, null, 2)}\n`);
      }
      
    } catch (error) {
      setResult(prev => prev + `错误: ${error}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">数据获取测试</h1>
      
      <button
        onClick={testFetch}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 mb-4"
      >
        {loading ? '测试中...' : '测试数据获取'}
      </button>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="font-semibold mb-2">测试结果:</h2>
        <pre className="text-sm overflow-auto max-h-96 whitespace-pre-wrap">
          {result || '点击上方按钮开始测试'}
        </pre>
      </div>
    </div>
  );
} 