import React, { useState, useRef, useEffect } from 'react';
import {
  FiSend,
  FiLink,
  FiCode,
  FiList,
  FiEye,
  FiEyeOff,
  FiHash,
  FiStar,
  FiMessageSquare
} from 'react-icons/fi';
import Markdown from 'marked-react';
import { memosApi } from '../api';

interface MemoEditorProps {
  onMemoCreated?: (memo: any) => void;
  editingMemo?: any;
  onCancelEdit?: () => void;
}

export const MemoEditor: React.FC<MemoEditorProps> = ({
  onMemoCreated,
  editingMemo,
  onCancelEdit
}) => {
  const [content, setContent] = useState(editingMemo?.content || '');
  const [visibility, setVisibility] = useState<'PRIVATE' | 'WORKSPACE' | 'PUBLIC'>(
    editingMemo?.visibility || 'PRIVATE'
  );
  const [pinned, setPinned] = useState(editingMemo?.pinned || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingMemo) {
      setContent(editingMemo.content);
      setVisibility(editingMemo.visibility);
      setPinned(editingMemo.pinned);
    }
  }, [editingMemo]);

  // 自动调整文本区域高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let memo;
      if (editingMemo) {
        memo = await memosApi.update(editingMemo.id, {
          content: content.trim(),
          visibility,
          pinned
        });
      } else {
        memo = await memosApi.create({
          content: content.trim(),
          visibility,
          pinned
        });
      }
      
      onMemoCreated?.(memo);
      if (!editingMemo) {
        setContent('');
      }
    } catch (error) {
      console.error('Failed to save memo:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (editingMemo && onCancelEdit) {
      onCancelEdit();
    } else {
      setContent('');
      setVisibility('PRIVATE');
      setPinned(false);
    }
  };

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    // 特殊处理代码块
    if (before === '\n```\n' && after === '\n```\n') {
      const newContent = content.substring(0, start) + 
        '\n```\n' + (selectedText || '// 在这里输入代码') + '\n```\n' + 
        content.substring(end);
      setContent(newContent);
      
      setTimeout(() => {
        textarea.focus();
        const cursorPos = selectedText ? start + 5 : start + 5;
        textarea.setSelectionRange(cursorPos, cursorPos + (selectedText || '// 在这里输入代码').length);
      }, 0);
      return;
    }
    
    const newContent = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newContent);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        end + before.length
      );
    }, 0);
  };



  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6">
      {/* 编辑器工具栏 */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => insertMarkdown('**', '**')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="粗体"
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => insertMarkdown('*', '*')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="斜体"
          >
            <em>I</em>
          </button>
          <button
            onClick={() => insertMarkdown('\n- ')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="无序列表"
          >
            <FiList />
          </button>
          <button
            onClick={() => insertMarkdown('\n- [ ] ')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="任务列表"
          >
            ☐
          </button>
          <button
            onClick={() => insertMarkdown('`', '`')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="行内代码"
          >
            <FiCode />
          </button>
          <button
            onClick={() => insertMarkdown('\n```\n', '\n```\n')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="代码块"
          >
            <span className="text-xs font-mono">{`{}`}</span>
          </button>
          <button
            onClick={() => insertMarkdown('[', '](url)')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="链接"
          >
            <FiLink />
          </button>
          <button
            onClick={() => insertMarkdown('\n> ')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="引用"
          >
            <FiMessageSquare />
          </button>
          <button
            onClick={() => insertMarkdown('#')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="标签"
          >
            <FiHash />
          </button>
        </div>
        
        <button
          onClick={() => setShowPreview(!showPreview)}
          className={`p-2 rounded ${showPreview ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
          title={showPreview ? '隐藏预览' : '显示预览'}
        >
          {showPreview ? <FiEyeOff /> : <FiEye />}
        </button>
      </div>

      {/* 主编辑区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 编辑器 */}
        <div className={showPreview ? '' : 'lg:col-span-2'}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="记录你的想法..."
            className="w-full min-h-[120px] max-h-[400px] p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                handleSubmit();
              }
            }}
          />
        </div>

        {/* 预览区域 */}
        {showPreview && (
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 overflow-auto max-h-[400px]">
            <div className="prose prose-sm max-w-none">
              <Markdown>{content || '*预览区域*'}</Markdown>
            </div>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-4">
          {/* 可见性选择 */}
          <div className="relative">
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'PRIVATE' | 'WORKSPACE' | 'PUBLIC')}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="PRIVATE">🔒 私有</option>
              <option value="WORKSPACE">👥 工作区</option>
              <option value="PUBLIC">🌍 公开</option>
            </select>
          </div>

          {/* 置顶选项 */}
          <button
            onClick={() => setPinned(!pinned)}
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm ${
              pinned 
                ? 'text-amber-600 bg-amber-50 border border-amber-200' 
                : 'text-gray-500 bg-gray-50 border border-gray-200 hover:text-gray-700'
            }`}
          >
            <FiStar className="w-4 h-4" />
            <span>置顶</span>
          </button>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-2">
          {editingMemo && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              取消
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <FiSend className="w-4 h-4" />
            <span>{isSubmitting ? '保存中...' : editingMemo ? '更新' : '发布'}</span>
          </button>
        </div>
      </div>

      {/* 快捷键提示 */}
      <div className="mt-2 text-xs text-gray-400">
        提示：Ctrl+Enter 快速发布
      </div>
    </div>
  );
}; 