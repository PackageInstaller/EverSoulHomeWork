'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // 自定义组件，禁用图片和链接，只保留文字格式
  const components: Components = {
    // 禁用图片
    img: () => null,
    
    // 禁用链接，只显示文本
    a: ({ children }) => <span className="text-blue-300">{children}</span>,
    
    // 自定义样式
    h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 text-white">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2 text-white">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-bold mt-2 mb-1 text-white">{children}</h3>,
    h4: ({ children }) => <h4 className="text-sm font-bold mt-2 mb-1 text-white">{children}</h4>,
    h5: ({ children }) => <h5 className="text-sm font-bold mt-1 mb-1 text-white">{children}</h5>,
    h6: ({ children }) => <h6 className="text-xs font-bold mt-1 mb-1 text-white">{children}</h6>,
    
    // 段落
    p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
    
    // 强调
    strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
    em: ({ children }) => <em className="italic text-white/90">{children}</em>,
    
    // 删除线
    del: ({ children }) => <del className="line-through text-white/60">{children}</del>,
    
    // 代码块
    code: ({ inline, children }) => {
      if (inline) {
        return (
          <code className="bg-white/10 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono">
            {children}
          </code>
        );
      }
      return (
        <pre className="bg-white/10 text-blue-300 p-2 rounded my-2 overflow-x-auto">
          <code className="font-mono text-sm">{children}</code>
        </pre>
      );
    },
    
    // 列表
    ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
    li: ({ children }) => <li className="text-white/90">{children}</li>,
    
    // 引用块
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-500/50 pl-3 my-2 text-white/80 italic">
        {children}
      </blockquote>
    ),
    
    // 水平线
    hr: () => <hr className="border-white/20 my-3" />,
    
    // 表格
    table: ({ children }) => (
      <div className="overflow-x-auto my-2">
        <table className="min-w-full border border-white/20">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-white/10">{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr className="border-b border-white/10">{children}</tr>,
    th: ({ children }) => (
      <th className="px-3 py-2 text-left text-white font-semibold border-r border-white/10 last:border-r-0">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 text-white/90 border-r border-white/10 last:border-r-0">
        {children}
      </td>
    ),
  };

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        // 禁用 HTML 标签解析
        disallowedElements={['img', 'iframe', 'script', 'style']}
        unwrapDisallowed={true}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

