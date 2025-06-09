import React, { useState, useEffect } from "react";
import { 
  FiPlus,
  FiGrid,
  FiList,
  FiFilter,
  FiRefreshCw
} from "react-icons/fi";
import { Memo, memosApi } from '../api';
import { MemoEditor } from './MemoEditor';
import { MemoView } from './MemoView';
import { MasonryView } from './MasonryView';

interface MainContentProps {
  selectedDate: Date | null;
  selectedTags: string[];
  searchQuery: string;
  onTagSelect?: (tags: string[]) => void;
}

export const MainContent: React.FC<MainContentProps> = ({
  selectedDate,
  selectedTags,
  searchQuery,
  onTagSelect
}) => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);
  const [listMode, setListMode] = useState(false);

  // 获取 memos
  const fetchMemos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await memosApi.getAll({ pageSize: 100 });
      setMemos(data.memos || []);
    } catch (error) {
      console.error('Failed to fetch memos:', error);
      setError('获取 memos 失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemos();
  }, []);

  // 过滤 memos
  const filteredMemos = memos.filter((memo: Memo) => {
    const matchesSearch = !searchQuery || 
      memo.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memo.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const memoDate = new Date(memo.createTime);
    const matchesDate = !selectedDate || 
      memoDate.toDateString() === selectedDate.toDateString();
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => memo.tags.includes(tag));
    
    return matchesSearch && matchesDate && matchesTags;
  });

  // 处理新建/编辑 memo
  const handleNewMemo = () => {
    setEditingMemo(null);
    setIsEditing(true);
  };

  const handleEditMemo = (memo: Memo) => {
    setEditingMemo(memo);
    setIsEditing(true);
  };

  const handleMemoCreated = (memo: Memo) => {
    if (editingMemo) {
      // 更新现有 memo
      setMemos(prev => prev.map(m => m.id === memo.id ? memo : m));
    } else {
      // 添加新 memo
      setMemos(prev => [memo, ...prev]);
    }
    setIsEditing(false);
    setEditingMemo(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingMemo(null);
  };

  const handleMemoUpdate = (updatedMemo: Memo) => {
    setMemos(prev => prev.map(m => m.id === updatedMemo.id ? updatedMemo : m));
  };

  const handleMemoDelete = (deletedMemo: Memo) => {
    setMemos(prev => prev.filter(m => m.id !== deletedMemo.id));
  };

  const handleTagClick = (tag: string) => {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    onTagSelect?.(newSelectedTags);
  };

  const memoRenderer = (memo: Memo) => (
    <MemoView
      memo={memo}
      onEdit={handleEditMemo}
      onDelete={handleMemoDelete}
      onUpdate={handleMemoUpdate}
      onTagClick={handleTagClick}
    />
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchMemos}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>重试</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <div className="p-6">
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">
            我的 Memos
          </h1>
          <span className="text-sm text-gray-500">
            {filteredMemos.length} 条记录
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* 布局切换 */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setListMode(false)}
              className={`p-2 rounded ${!listMode ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="网格视图"
            >
              <FiGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setListMode(true)}
              className={`p-2 rounded ${listMode ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="列表视图"
            >
              <FiList className="w-4 h-4" />
            </button>
          </div>

          {/* 新建按钮 */}
          <button
            onClick={handleNewMemo}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <FiPlus className="w-4 h-4" />
            <span>新建 Memo</span>
          </button>
        </div>
      </div>

      {/* 编辑器 */}
      {isEditing && (
        <MemoEditor
          editingMemo={editingMemo}
          onMemoCreated={handleMemoCreated}
          onCancelEdit={handleCancelEdit}
        />
      )}

      {/* Memo 列表 */}
      {filteredMemos.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <FiFilter className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || selectedDate || selectedTags.length > 0 ? '没有找到匹配的 Memo' : '还没有任何 Memo'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || selectedDate || selectedTags.length > 0 
              ? '试试调整搜索条件或筛选器' 
              : '点击"新建 Memo"开始记录你的想法'}
          </p>
          {!searchQuery && !selectedDate && selectedTags.length === 0 && (
            <button
              onClick={handleNewMemo}
              className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 mx-auto"
            >
              <FiPlus className="w-5 h-5" />
              <span>创建第一个 Memo</span>
            </button>
          )}
        </div>
      ) : (
        <MasonryView
          memoList={filteredMemos}
          renderer={memoRenderer}
          listMode={listMode}
          className="max-w-6xl mx-auto"
        />
      )}
      </div>
    </div>
  );
}; 