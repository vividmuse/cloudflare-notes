import React, { useState, useRef, useEffect } from 'react';
import {
  FiEdit3,
  FiTrash2,
  FiStar,
  FiCopy,
  FiLink,
  FiCalendar,
  FiHash,
  FiMoreHorizontal,
  FiGlobe,
  FiLock,
  FiUsers
} from 'react-icons/fi';
import Markdown from 'marked-react';
import { Memo, memosApi, utils } from '../api';

interface MemoViewProps {
  memo: Memo;
  onEdit?: (memo: Memo) => void;
  onDelete?: (memo: Memo) => void;
  onUpdate?: (memo: Memo) => void;
}

export const MemoView: React.FC<MemoViewProps> = ({
  memo,
  onEdit,
  onDelete,
  onUpdate
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTogglePin = async () => {
    try {
      const updatedMemo = await memosApi.update(memo.id!, {
        pinned: !memo.pinned
      });
      onUpdate?.(updatedMemo);
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除这条 memo 吗？')) return;
    
    setIsDeleting(true);
    try {
      await memosApi.delete(memo.id!);
      onDelete?.(memo);
    } catch (error) {
      console.error('Failed to delete memo:', error);
      alert('删除失败，请重试');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(memo.content);
    alert('已复制到剪贴板');
    setShowMenu(false);
  };

  const getVisibilityIcon = () => {
    switch (memo.visibility) {
      case 'PUBLIC':
        return <FiGlobe className="w-3 h-3" />;
      case 'WORKSPACE':
        return <FiUsers className="w-3 h-3" />;
      default:
        return <FiLock className="w-3 h-3" />;
    }
  };

  const getVisibilityText = () => {
    switch (memo.visibility) {
      case 'PUBLIC':
        return '公开';
      case 'WORKSPACE':
        return '工作区';
      default:
        return '私有';
    }
  };

  const extractTags = (content: string): string[] => {
    const tagRegex = /#([^\s#]+)/g;
    const tags: string[] = [];
    let match;
    while ((match = tagRegex.exec(content)) !== null) {
      if (!tags.includes(match[1])) {
        tags.push(match[1]);
      }
    }
    return tags;
  };



  const tags = extractTags(memo.content);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            {getVisibilityIcon()}
            <span>{getVisibilityText()}</span>
          </div>
          
          {memo.pinned && (
            <div className="flex items-center space-x-1 text-amber-600">
              <FiStar className="w-3 h-3 fill-current" />
              <span>置顶</span>
            </div>
          )}
          
          <div className="flex items-center space-x-1">
            <FiCalendar className="w-3 h-3" />
            <span>{utils.formatTime(memo.createTime)}</span>
          </div>
        </div>

        {/* 操作菜单 */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <FiMoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-6 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="py-1">
                <button
                  onClick={() => {
                    onEdit?.(memo);
                    setShowMenu(false);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FiEdit3 className="w-4 h-4" />
                  <span>编辑</span>
                </button>
                
                <button
                  onClick={handleTogglePin}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FiStar className={`w-4 h-4 ${memo.pinned ? 'fill-current text-amber-500' : ''}`} />
                  <span>{memo.pinned ? '取消置顶' : '置顶'}</span>
                </button>
                
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FiCopy className="w-4 h-4" />
                  <span>复制内容</span>
                </button>
                
                <hr className="my-1" />
                
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <FiTrash2 className="w-4 h-4" />
                  <span>{isDeleting ? '删除中...' : '删除'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="memo-content prose prose-sm max-w-none mb-3 overflow-hidden">
        <div className="whitespace-pre-wrap break-words">
          <Markdown>{memo.content}</Markdown>
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 transition-colors"
            >
              <FiHash className="w-3 h-3" />
              <span>{tag}</span>
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <span>ID: {memo.id}</span>
          {memo.updateTime !== memo.createTime && (
            <span>• 已编辑</span>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <FiLink className="w-3 h-3" />
          <span>分享</span>
        </div>
      </div>
    </div>
  );
}; 