import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { 
  FiHome, 
  FiSearch, 
  FiBookmark,
  FiCheckSquare,
  FiHash,
  FiCompass,
  FiSettings,
  FiUser,
  FiLogOut,
  FiBarChart2,
  FiGlobe
} from "react-icons/fi";
import { Memo, memosApi, User } from '../api';
import { SettingsModal } from './SettingsModal';

interface SidebarProps {
  user: User;
  onSearch: (query: string) => void;
  onDateSelect: (date: Date | null) => void;
  onTagSelect: (tags: string[]) => void;
  onLogout: () => void;
  onUserUpdate?: (user: User) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  user, 
  onSearch, 
  onDateSelect, 
  onTagSelect, 
  onLogout,
  onUserUpdate 
}) => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pinned: 0,
    todo: 0,
    public: 0
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [memosData, statsData] = await Promise.all([
          memosApi.getAll({ pageSize: 100 }),
          memosApi.getStats()
        ]);
        setMemos(memosData.memos);
        setStats(statsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, []);

  // 获取特定日期的笔记
  const getMemosForDate = (date: Date) => {
    const targetDate = date.toDateString();
    return memos.filter((memo: Memo) => {
      const memoDate = new Date(memo.createTime);
      return memoDate.toDateString() === targetDate;
    });
  };

  // 自定义日历瓦片内容
  const tileContent = ({ date }: { date: Date }): JSX.Element | null => {
    const memosForDate = getMemosForDate(date);
    if (memosForDate.length > 0) {
      return (
        <div className="text-[10px] text-indigo-600 absolute bottom-0 left-1/2 transform -translate-x-1/2">
          {memosForDate.length}
        </div>
      );
    }
    return null;
  };

  // 获取所有标签
  const allTags = Array.from(new Set(
    memos.flatMap((memo: Memo) => memo.tags || [])
  )).sort();

  // 搜索事件处理
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  // 日期选择
  const handleDateSelect = (value: any) => {
    if (value instanceof Date) {
      setSelectedDate(value);
      onDateSelect(value);
    }
  };

  // 标签选择
  const handleTagClick = (tag: string) => {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    setSelectedTags(newSelectedTags);
    onTagSelect(newSelectedTags);
  };

  // 清除所有过滤器
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedDate(null);
    setSelectedTags([]);
    onSearch('');
    onDateSelect(null);
    onTagSelect([]);
  };

  return (
    <div className="w-80 border-r bg-white flex flex-col h-screen">
      {/* 用户信息 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <FiUser className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {user.nickname || user.name}
              </div>
              <div className="text-sm text-gray-500">
                {user.role === 'HOST' ? '管理员' : user.role === 'ADMIN' ? '管理员' : '用户'}
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="退出登录"
          >
            <FiLogOut className="w-4 h-4" />
          </button>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="搜索笔记..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>
      </div>

      {/* 导航菜单 */}
      <div className="p-4">
        <nav className="space-y-1">
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
            <FiHome className="w-4 h-4" />
            <span className="font-medium">全部笔记</span>
            <span className="ml-auto text-sm bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              {stats.total}
            </span>
          </a>
          
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700">
            <FiBookmark className="w-4 h-4" />
            <span>置顶笔记</span>
            <span className="ml-auto text-sm text-gray-500">{stats.pinned}</span>
          </a>
          
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700">
            <FiCheckSquare className="w-4 h-4" />
            <span>待办事项</span>
            <span className="ml-auto text-sm text-gray-500">{stats.todo}</span>
          </a>
          
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700">
            <FiGlobe className="w-4 h-4" />
            <span>公开笔记</span>
            <span className="ml-auto text-sm text-gray-500">{stats.public}</span>
          </a>
        </nav>
      </div>

      {/* 过滤器状态 */}
      {(selectedDate || selectedTags.length > 0) && (
        <div className="px-4 pb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">当前过滤</span>
              <button
                onClick={handleClearFilters}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                清除全部
              </button>
            </div>
            
            {selectedDate && (
              <div className="text-sm text-blue-800 mb-1">
                日期: {format(selectedDate, 'yyyy-MM-dd')}
              </div>
            )}
            
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 日历 */}
      <div className="px-4 pb-4">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-gray-900 flex items-center">
            <FiCompass className="w-4 h-4 mr-2" />
            日历视图
          </h3>
        </div>
        <Calendar
          onChange={handleDateSelect}
          value={selectedDate}
          tileContent={tileContent}
          className="w-full border border-gray-200 rounded-lg modern-calendar"
          maxDate={new Date()}
          minDetail="month"
          formatDay={(_, date: Date) => format(date, 'd')}
          tileClassName={({ date, view }) => {
            const baseClass = "hover:bg-indigo-50 relative pt-2 transition-colors";
            if (view === 'month' && selectedDate && date.toDateString() === selectedDate.toDateString()) {
              return `${baseClass} bg-indigo-100 text-indigo-900`;
            }
            return baseClass;
          }}
          showNeighboringMonth={false}
          showFixedNumberOfWeeks={false}
          calendarType="gregory"
          nextLabel={<span className="text-gray-600">→</span>}
          prevLabel={<span className="text-gray-600">←</span>}
          next2Label={null}
          prev2Label={null}
          navigationLabel={({ date }) => format(date, 'yyyy年 MM月')}
        />
      </div>

      {/* 标签云 */}
      <div className="px-4 pb-4 flex-1 overflow-auto">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-gray-900 flex items-center">
            <FiHash className="w-4 h-4 mr-2" />
            标签
          </h3>
        </div>
        
        {allTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">暂无标签</p>
        )}
      </div>

      {/* 底部操作 */}
      <div className="p-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors">
            <FiBarChart2 className="w-4 h-4" />
            统计
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FiSettings className="w-4 h-4" />
            设置
          </button>
        </div>
      </div>

      {/* 设置模态框 */}
      <SettingsModal
        user={user}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onUserUpdate={(updatedUser) => {
          onUserUpdate?.(updatedUser);
          setShowSettings(false);
        }}
      />
    </div>
  );
}; 