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
  FiCode,
  FiLink
} from "react-icons/fi";
import { Note } from '../api';
import { notesApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

export const Sidebar: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuth();

  const fetchNotes = async () => {
    try {
      const data = await notesApi.getAll();
      setNotes(data);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  // 监听笔记变化
  useEffect(() => {
    const handleNoteChange = () => {
      fetchNotes();
    };

    window.addEventListener('noteChange', handleNoteChange);
    return () => {
      window.removeEventListener('noteChange', handleNoteChange);
    };
  }, []);

  // 获取特定日期的笔记
  const getNotesForDate = (date: Date) => {
    // 设置目标日期为当天的 00:00:00
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    return notes.filter((note: Note) => {
      // 转换为本地时间（10位时间戳）
      const noteDate = new Date(note.created_at * 1000);
      // 设置笔记日期为当天的 00:00:00
      const noteDay = new Date(noteDate.getFullYear(), noteDate.getMonth(), noteDate.getDate());

      return noteDay.getTime() === targetDate.getTime();
    });
  };

  // 自定义日历瓦片内容
  const tileContent = ({ date }: { date: Date }): JSX.Element | null => {
    const notesForDate = getNotesForDate(date);
    // 调试日志
    console.log('Tile content:', {
      date: date.toISOString(),
      notesCount: notesForDate.length,
      notes: notesForDate.map(n => ({ id: n.id, created_at: new Date(n.created_at * 1000).toISOString() }))
    });

    if (notesForDate.length > 0) {
      return (
        <div className="text-[10px] text-blue-600 absolute bottom-0 left-1/2 transform -translate-x-1/2">
          {notesForDate.length}
        </div>
      );
    }
    return null;
  };

  // 过滤笔记用于显示
  const filteredNotes = notes.filter((note: Note) => {
    const matchesSearch = !searchQuery || note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = !selectedDate || getNotesForDate(selectedDate).some(n => n.id === note.id);
    return matchesSearch && matchesDate;
  }).sort((a, b) => {
    // 按时间戳降序排序（10位时间戳）
    return b.created_at - a.created_at;
  });

  const todoNotes = filteredNotes.filter((note: Note) => note.content.includes('- [ ]') || note.content.includes('- [x]'));
  const completedTodoCount = todoNotes.filter((note: Note) => note.content.includes('- [x]')).length;
  const totalTodoCount = todoNotes.length;

  // 获取所有标签
  const allTags = Array.from(new Set(
    filteredNotes.flatMap((note: Note) => {
      const tags = typeof note.tags === 'string' ? JSON.parse(note.tags) : note.tags;
      return Array.isArray(tags) ? tags : [];
    })
  )).sort() as string[];

  // 搜索事件处理
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // 触发全局搜索状态更新
    window.dispatchEvent(new CustomEvent('search', { 
      detail: { query: e.target.value } 
    }));
  };

  // 获取 pinned 笔记数量
  const pinnedCount = filteredNotes.filter((note: Note) => note.is_pinned).length;

  return (
    <div className="w-64 border-r bg-white p-4 flex flex-col h-screen">
      {/* 用户信息 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="text-sm font-medium text-gray-700">{user?.username}</div>
        </div>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Logout
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search memos..."
            className="w-full pl-10 pr-4 py-2 border rounded bg-gray-50"
          />
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      <nav className="space-y-2">
        <a href="#" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100">
          <FiHome className="text-gray-600" />
          <span>Home</span>
          <span className="ml-auto text-sm text-gray-500">{filteredNotes.length}</span>
        </a>
        <a href="#" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100">
          <FiCompass className="text-gray-600" />
          <span>Explore</span>
        </a>
      </nav>

      {/* 日历部分 */}
      <div className="mt-6">
        <Calendar
          onChange={(value: any) => {
            if (value instanceof Date) {
              setSelectedDate(value);
              // 触发日期选择事件
              window.dispatchEvent(new CustomEvent('dateSelect', { 
                detail: { date: value } 
              }));
            }
          }}
          value={selectedDate || new Date()}
          tileContent={tileContent}
          className="w-full border-none shadow-none modern-calendar"
          maxDate={new Date()}
          minDetail="month"
          formatDay={(_, date: Date) => format(date, 'd')}
          tileClassName="hover:bg-blue-50 relative pt-2"
          showNeighboringMonth={false}
          showFixedNumberOfWeeks={false}
          calendarType="gregory"
          nextLabel={<span className="text-gray-600">→</span>}
          prevLabel={<span className="text-gray-600">←</span>}
          next2Label={null}
          prev2Label={null}
          navigationLabel={({ date }) => format(date, 'MMMM yyyy')}
        />
      </div>

      {/* 标签列表 */}
      <div className="mt-4">
        <div className="text-sm font-medium text-gray-600 mb-2">Tags</div>
        <div className="flex flex-wrap gap-2">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('tagSelect', { 
                  detail: { tag } 
                }));
              }}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <FiHash />
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* 底部链接 */}
      <div className="mt-auto space-y-2">
        <button 
          onClick={() => {
            window.dispatchEvent(new CustomEvent('filterNotes', { 
              detail: { type: 'pinned' } 
            }));
          }}
          className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
        >
          <FiBookmark /> 
          <span className="flex-1 text-left">Pinned</span>
          <span>{pinnedCount}</span>
        </button>
        <div className="flex items-center gap-2 px-2 text-sm text-gray-600">
          <FiLink /> Links <span className="ml-auto">1</span>
        </div>
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('filterNotes', { 
              detail: { type: 'todo' } 
            }));
          }}
          className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
        >
          <FiCheckSquare /> 
          <span className="flex-1 text-left">To-do</span>
          <span>{completedTodoCount}/{totalTodoCount}</span>
        </button>
        <div className="flex items-center gap-2 px-2 text-sm text-gray-600">
          <FiCode /> Code <span className="ml-auto">2</span>
        </div>
      </div>
    </div>
  );
}; 