'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import MarkdownRenderer from './MarkdownRenderer';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
}

interface ContextMenu {
  show: boolean;
  x: number;
  y: number;
  selectedText: string;
  start: number;
  end: number;
}

export default function MarkdownEditor({ 
  value, 
  onChange, 
  maxLength = 1024,
  placeholder = "请输入内容..."
}: MarkdownEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  // 默认分屏，移动端自动切换到编辑模式
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [tempValue, setTempValue] = useState(value);
  const [contextMenu, setContextMenu] = useState<ContextMenu>({
    show: false,
    x: 0,
    y: 0,
    selectedText: '',
    start: 0,
    end: 0
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mounted, setMounted] = useState(false);
  const scrollYRef = useRef(0); // 保存滚动位置

  useEffect(() => {
    setMounted(true);
    // 检测移动端，自动切换到编辑模式
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setPreviewMode('edit');
    }
  }, []);

  // 阻止body滚动并保持滚动位置
  useEffect(() => {
    if (isOpen) {
      // 保存当前滚动位置
      scrollYRef.current = window.scrollY;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      // 锁定body滚动
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`; // 防止页面跳动
      
      return () => {
        // 恢复body滚动
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // 恢复滚动位置（确保在下一帧执行）
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollYRef.current);
        });
      };
    }
  }, [isOpen]);

  const handleOpen = () => {
    setTempValue(value);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setContextMenu({ ...contextMenu, show: false });
  };

  const handleSave = () => {
    onChange(tempValue);
    setIsOpen(false);
    setContextMenu({ ...contextMenu, show: false });
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsOpen(false);
    setContextMenu({ ...contextMenu, show: false });
  };

  // 按 ESC 关闭
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // 处理文本选择
  const handleTextSelect = () => {
    if (!textareaRef.current) return;
    
    // 使用 setTimeout 确保 selectionStart/End 已经更新
    setTimeout(() => {
      if (!textareaRef.current) return;
      
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selectedText = tempValue.substring(start, end);
      
      console.log('Selection:', { start, end, selectedText, length: selectedText.length }); // 调试
      
      // 只有当真正选中文本时才显示菜单（start !== end）
      if (selectedText.length > 0 && start !== end) {
        // 获取 textarea 的位置（相对于视口）
        const rect = textareaRef.current.getBoundingClientRect();
        
        console.log('Menu position:', { x: rect.left + rect.width / 2, y: rect.top + 60 }); // 调试
        console.log('Showing context menu!'); // 调试
        
        // 使用 fixed 定位，相对于视口
        // 菜单显示在 textarea 顶部下方一点
        setContextMenu({
          show: true,
          x: rect.left + rect.width / 2, // 水平居中
          y: rect.top + 60, // textarea 顶部往下 60px
          selectedText,
          start,
          end
        });
      } else {
        // 没有选中文本，隐藏菜单
        if (contextMenu.show) {
          console.log('Hiding context menu'); // 调试
          setContextMenu(prev => ({ ...prev, show: false }));
        }
      }
    }, 10);
  };

  // 应用 Markdown 格式
  const applyFormat = (format: string) => {
    if (!textareaRef.current) return;

    const { start, end, selectedText } = contextMenu;
    let newText = tempValue;
    let formattedText = '';
    let cursorOffset = 0;

    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        cursorOffset = 2;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        cursorOffset = 1;
        break;
      case 'strikethrough':
        formattedText = `~~${selectedText}~~`;
        cursorOffset = 2;
        break;
      case 'code':
        formattedText = `\`${selectedText}\``;
        cursorOffset = 1;
        break;
      case 'h1':
        formattedText = `# ${selectedText}`;
        cursorOffset = 2;
        break;
      case 'h2':
        formattedText = `## ${selectedText}`;
        cursorOffset = 3;
        break;
      case 'h3':
        formattedText = `### ${selectedText}`;
        cursorOffset = 4;
        break;
      case 'quote':
        formattedText = `> ${selectedText}`;
        cursorOffset = 2;
        break;
      case 'ul':
        formattedText = `- ${selectedText}`;
        cursorOffset = 2;
        break;
      case 'ol':
        formattedText = `1. ${selectedText}`;
        cursorOffset = 3;
        break;
    }

    newText = tempValue.substring(0, start) + formattedText + tempValue.substring(end);
    setTempValue(newText);
    setContextMenu({ ...contextMenu, show: false });

    // 恢复光标位置
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          start + cursorOffset,
          start + cursorOffset + selectedText.length
        );
      }
    }, 0);
  };

  // 监控 contextMenu 变化
  useEffect(() => {
    console.log('Context menu state changed:', contextMenu); // 调试
  }, [contextMenu]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu.show) {
        // 检查点击是否在菜单或 textarea 外部
        const target = e.target as HTMLElement;
        if (target !== textareaRef.current && !target.closest('.format-menu')) {
          setContextMenu(prev => ({ ...prev, show: false }));
        }
      }
    };
    
    if (contextMenu.show) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu.show]);

  // 模态框内容
  const modalContent = isOpen ? (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
          onKeyDown={handleKeyDown}
        >
          <div 
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-white">作业说明编辑器</h2>
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                  <button
                    onClick={() => setPreviewMode('edit')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      previewMode === 'edit'
                        ? 'bg-blue-500 text-white'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    编辑
                  </button>
                  {/* 隐藏分屏模式在移动端 */}
                  <button
                    onClick={() => setPreviewMode('split')}
                    className={`hidden md:block px-3 py-1 rounded text-sm transition-colors ${
                      previewMode === 'split'
                        ? 'bg-blue-500 text-white'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    分屏
                  </button>
                  <button
                    onClick={() => setPreviewMode('preview')}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      previewMode === 'preview'
                        ? 'bg-blue-500 text-white'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    预览
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-sm">
                  {tempValue.length}/{maxLength} 字
                </span>
                <button
                  onClick={handleCancel}
                  className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Markdown 语法提示 */}
            <div className="px-4 py-2 bg-blue-500/10 border-b border-white/10 text-xs text-white/70 flex items-center gap-4 overflow-x-auto">
              <span className="whitespace-nowrap">**粗体**</span>
              <span className="whitespace-nowrap">*斜体*</span>
              <span className="whitespace-nowrap">~~删除线~~</span>
              <span className="whitespace-nowrap">`代码`</span>
              <span className="whitespace-nowrap"># 标题</span>
              <span className="whitespace-nowrap">- 列表</span>
              <span className="whitespace-nowrap">&gt; 引用</span>
              <span className="whitespace-nowrap">|表格|</span>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-hidden flex relative">
              {/* 编辑区 */}
              {(previewMode === 'edit' || previewMode === 'split') && (
                <div className={`${previewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col border-r border-white/10`}>
                  <div className="px-4 py-2 bg-white/5 text-white/80 text-sm font-medium border-b border-white/10">
                    Markdown 源码
                    <span className="text-white/40 text-xs ml-2 font-normal">（选中文字显示格式化菜单）</span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onMouseUp={handleTextSelect}
                    onDoubleClick={handleTextSelect}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent border-none px-4 py-3 text-white placeholder-white/30 focus:outline-none resize-none font-mono text-sm leading-relaxed"
                    maxLength={maxLength}
                    autoFocus
                  />
                </div>
              )}

              {/* 格式化菜单（固定在模态框内） */}
              {contextMenu.show && (
                <div
                  className="format-menu fixed z-[250] bg-gray-900 border border-white/20 rounded-lg shadow-2xl p-2 flex items-center gap-1"
                  style={{
                    top: `${contextMenu.y}px`,
                    left: `${contextMenu.x}px`,
                    transform: 'translateX(-50%)'
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button onClick={() => applyFormat('bold')} className="p-2 hover:bg-white/10 rounded text-white text-sm font-bold" title="粗体">
                    <strong>B</strong>
                  </button>
                  <button onClick={() => applyFormat('italic')} className="p-2 hover:bg-white/10 rounded text-white text-sm italic" title="斜体">
                    <em>I</em>
                  </button>
                  <button onClick={() => applyFormat('strikethrough')} className="p-2 hover:bg-white/10 rounded text-white text-sm line-through" title="删除线">
                    S
                  </button>
                  <button onClick={() => applyFormat('code')} className="p-2 hover:bg-white/10 rounded text-white text-xs font-mono bg-white/5" title="代码">
                    &lt;/&gt;
                  </button>
                  <div className="w-px h-6 bg-white/20"/>
                  <button onClick={() => applyFormat('h1')} className="p-2 hover:bg-white/10 rounded text-white text-sm font-bold" title="标题1">
                    H1
                  </button>
                  <button onClick={() => applyFormat('h2')} className="p-2 hover:bg-white/10 rounded text-white text-sm font-bold" title="标题2">
                    H2
                  </button>
                  <button onClick={() => applyFormat('h3')} className="p-2 hover:bg-white/10 rounded text-white text-sm font-bold" title="标题3">
                    H3
                  </button>
                  <div className="w-px h-6 bg-white/20"></div>
                  <button onClick={() => applyFormat('quote')} className="p-2 hover:bg-white/10 rounded text-white text-sm" title="引用">
                    "
                  </button>
                  <button onClick={() => applyFormat('ul')} className="p-2 hover:bg-white/10 rounded text-white text-sm" title="无序列表">
                    •
                  </button>
                  <button onClick={() => applyFormat('ol')} className="p-2 hover:bg-white/10 rounded text-white text-sm" title="有序列表">
                    1.
                  </button>
                </div>
              )}

              {/* 预览区 */}
              {(previewMode === 'preview' || previewMode === 'split') && (
                <div className={`${previewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col`}>
                  <div className="px-4 py-2 bg-white/5 text-white/80 text-sm font-medium border-b border-white/10">
                    实时预览
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    {tempValue.trim() ? (
                      <MarkdownRenderer content={tempValue} />
                    ) : (
                      <span className="text-white/30 text-sm">暂无内容</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between">
              <div className="text-white/50 text-sm">
                按 <kbd className="px-2 py-1 bg-white/10 rounded text-xs">ESC</kbd> 取消
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
  ) : null;

  return (
    <>
      {/* 触发按钮 */}
      <div className="relative">
        <div
          onClick={handleOpen}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white min-h-[80px] cursor-pointer hover:bg-white/15 transition-colors flex items-start"
        >
          {value ? (
            <span className="text-white/90">{value.slice(0, 100)}{value.length > 100 ? '...' : ''}</span>
          ) : (
            <span className="text-white/50">{placeholder}</span>
          )}
        </div>
        <div className="absolute bottom-2 right-2 text-white/40 text-xs pointer-events-none flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          点击展开编辑器
        </div>
      </div>

      {/* 使用 Portal 渲染模态框到 body */}
      {mounted && isOpen && createPortal(modalContent, document.body)}
    </>
  );
}

