import React, { useState, useEffect, useRef } from "react";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import DOMPurify from "dompurify";
import { format, isSameDay, startOfDay, endOfDay } from "date-fns";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { FiEdit2, FiTrash2, FiEye, FiEyeOff, FiSearch, FiSave, FiX, FiTag, FiHash, FiCalendar, FiHome, FiCompass, FiBookmark, FiLink, FiCheckSquare, FiCode, FiMoreVertical, FiMessageSquare, FiStar, FiMapPin, FiLock, FiImage, FiPaperclip } from "react-icons/fi";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Toaster, toast } from "react-hot-toast";
import "highlight.js/styles/github.css";
import "./App.css";

console.log('App.tsx loaded');

const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str: string, lang: string): string => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
      } catch (__) {}
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
}).disable(['image']);

// 添加自定义的图片渲染规则
md.renderer.rules.image = (tokens, idx) => {
  const token = tokens[idx];
  const srcIndex = token.attrIndex('src');
  const src = token.attrs?.[srcIndex]?.[1] || '';
  const altIndex = token.attrIndex('alt');
  const alt = token.attrs?.[altIndex]?.[1] || '';
  
  // 只处理相对路径或 http/https 链接
  if (src.startsWith('./') || src.startsWith('/') || src.startsWith('http')) {
    return `<img src="${src}" alt="${alt}" />`;
  }
  return `<span>[Image: ${alt}]</span>`;
};

interface Note {
  id: string;
  content: string;
  tags: string[];
  created_at: number;
  updated_at: number;
  is_todo: boolean;
  is_pinned: boolean;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      const newTag = input.trim();
      if (!tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInput("");
      setSuggestions([]);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="flex flex-wrap gap-2 p-2 border rounded">
      {tags.map(tag => (
        <span
          key={tag}
          className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center gap-1"
        >
          <FiHash className="text-blue-600" />
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="text-blue-600 hover:text-blue-800"
          >
            <FiX className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add tag..."
        className="flex-1 min-w-[120px] outline-none"
      />
    </div>
  );
}

function NoteEditor({ note, onCancel }: { note?: Note; onCancel: () => void }) {
  console.log('NoteEditor rendered');
  const [content, setContent] = useState(note?.content || "");
  const [preview, setPreview] = useState(false);
  const queryClient = useQueryClient();

  // 当 note 改变时更新 content
  useEffect(() => {
    setContent(note?.content || "");
  }, [note]);

  // 解析内容中的标签
  const parseTags = (text: string): string[] => {
    const tagRegex = /#([a-zA-Z0-9\u4e00-\u9fa5_-]+)/g;
    const matches = text.match(tagRegex) || [];
    return matches.map(tag => tag.slice(1)); // 移除 # 符号
  };

  const createNoteMutation = useMutation({
    mutationFn: async (note: { content: string; tags: string[] }) => {
      console.log('Creating note:', note);
      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(note),
        });
        
        if (!res.ok) {
          const error = await res.text();
          throw new Error(error || "Failed to create note");
        }
        
        const data = await res.json();
        console.log('Created note:', data);
        return data;
      } catch (error) {
        console.error('Create note error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setContent("");
      toast.success("Note created successfully!");
      onCancel();
    },
    onError: (error) => {
      console.error('Create note error:', error);
      toast.error(error.message || "Failed to create note");
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async (note: { id: string; content: string; tags: string[] }) => {
      console.log('Updating note:', note);
      try {
        const res = await fetch(`/api/notes/${note.id}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ content: note.content, tags: note.tags }),
        });
        
        if (!res.ok) {
          const error = await res.text();
          throw new Error(error || "Failed to update note");
        }
        
        const data = await res.json();
        console.log('Updated note:', data);
        return data;
      } catch (error) {
        console.error('Update note error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note updated successfully!");
      onCancel();
    },
    onError: (error) => {
      console.error('Update note error:', error);
      toast.error(error.message || "Failed to update note");
    },
  });

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }

    const tags = parseTags(content);

    if (note) {
      updateNoteMutation.mutate({ id: note.id, content, tags });
    } else {
      createNoteMutation.mutate({ content, tags });
    }
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{note ? "Edit Note" : "New Note"}</h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <FiX />
        </button>
      </div>
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => setPreview(!preview)}
          className="bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          {preview ? <FiEyeOff /> : <FiEye />} {preview ? "Edit" : "Preview"}
        </button>
      </div>
      {preview ? (
        <div
          className="prose max-w-none p-4 border rounded"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(md.render(content)),
          }}
        />
      ) : (
      <textarea
        value={content}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
          placeholder="Write your markdown here... Use #tag to add tags"
          className="w-full h-40 p-2 border rounded"
        />
      )}
      <button
        onClick={handleSubmit}
        disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded mt-2 disabled:opacity-50 flex items-center gap-2"
      >
        {createNoteMutation.isPending || updateNoteMutation.isPending ? (
          "Saving..."
        ) : (
          <>
            <FiSave />
            {note ? "Update Note" : "Save Note"}
          </>
        )}
      </button>
    </div>
  );
}

function Sidebar() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: notes = [] } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const res = await fetch("/api/notes");
      if (!res.ok) throw new Error("Failed to fetch notes");
      const data = await res.json();
      // 确保每个笔记的 tags 都是数组
      return data.map((note: any) => ({
        ...note,
        tags: typeof note.tags === 'string' ? JSON.parse(note.tags) : (note.tags || [])
      }));
    },
  });

  // 获取指定日期的笔记
  const getNotesForDate = (date: Date) => {
    return notes.filter((note: Note) => {
      const noteDate = new Date(note.created_at);
      return isSameDay(noteDate, date);
    });
  };

  // 自定义日历瓦片内容
  const tileContent = ({ date }: { date: Date }): JSX.Element | null => {
    const notesForDate = getNotesForDate(date);
    if (notesForDate.length > 0) {
      return (
        <div className="text-[10px] text-blue-600 absolute bottom-0 left-1/2 transform -translate-x-1/2">
          {notesForDate.length}
        </div>
      );
    }
    return null;
  };

  // 获取所有标签
  const allTags = Array.from(new Set(notes.flatMap((note: Note) => note.tags || []))).sort() as string[];

  // 搜索事件处理
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // 触发全局搜索状态更新
    window.dispatchEvent(new CustomEvent('search', { 
      detail: { query: e.target.value } 
    }));
  };

  // 获取 pinned 笔记数量
  const pinnedCount = notes.filter((note: Note) => note.is_pinned).length;

  // 获取 todo 笔记数量
  const todoNotes = notes.filter((note: Note) => note.is_todo);
  const completedTodoCount = todoNotes.filter((note: Note) => note.content.includes('- [x]')).length;
  const totalTodoCount = todoNotes.length;

  return (
    <div className="w-64 border-r bg-white p-4 flex flex-col h-screen">
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
          <span className="ml-auto text-sm text-gray-500">{notes.length}</span>
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
          formatDay={(locale: string | undefined, date: Date) => format(date, 'd')}
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
}

function MainContent() {
  const [content, setContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<'all' | 'pinned' | 'todo'>('all');

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // 监听搜索事件
    const handleSearch = (e: CustomEvent) => {
      setSearchQuery(e.detail.query);
    };
    // 监听日期选择事件
    const handleDateSelect = (e: CustomEvent) => {
      setSelectedDate(e.detail.date);
    };
    // 监听标签选择事件
    const handleTagSelect = (e: CustomEvent) => {
      setSelectedTag(e.detail.tag);
    };

    // 监听筛选事件
    const handleFilter = (e: CustomEvent) => {
      setFilterType(e.detail.type);
      setSearchQuery('');
      setSelectedDate(null);
      setSelectedTag(null);
    };

    window.addEventListener('search', handleSearch as EventListener);
    window.addEventListener('dateSelect', handleDateSelect as EventListener);
    window.addEventListener('tagSelect', handleTagSelect as EventListener);
    window.addEventListener('filterNotes', handleFilter as EventListener);

    return () => {
      window.removeEventListener('search', handleSearch as EventListener);
      window.removeEventListener('dateSelect', handleDateSelect as EventListener);
      window.removeEventListener('tagSelect', handleTagSelect as EventListener);
      window.removeEventListener('filterNotes', handleFilter as EventListener);
    };
  }, []);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const res = await fetch("/api/notes");
      if (!res.ok) throw new Error("Failed to fetch notes");
      const data = await res.json();
      // 确保每个笔记的 tags 都是数组
      return data.map((note: any) => ({
        ...note,
        tags: typeof note.tags === 'string' ? JSON.parse(note.tags) : (note.tags || [])
      }));
    },
  });

  // 过滤笔记
  const filteredNotes = notes.filter((note: Note) => {
    // 首先应用 pinned/todo 过滤
    if (filterType === 'pinned' && !note.is_pinned) return false;
    if (filterType === 'todo' && !note.is_todo) return false;

    // 然后应用其他过滤条件
    const matchesSearch = searchQuery ? 
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) : true;
    
    const matchesDate = selectedDate ? 
      isSameDay(new Date(note.created_at), selectedDate) : true;
    
    const matchesTag = selectedTag ? 
      note.tags?.includes(selectedTag) : true;
    
    return matchesSearch && matchesDate && matchesTag;
  });

  // 对笔记进行排序：置顶的笔记优先显示
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return b.created_at - a.created_at;
  });

  const createNoteMutation = useMutation({
    mutationFn: async (note: { content: string; tags: string[] }) => {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      });
      if (!res.ok) throw new Error("Failed to create note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setContent("");
      toast.success("Note created successfully!");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete note");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note deleted successfully!");
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async (note: { id: string; content: string; tags: string[] }) => {
      const res = await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: note.content, tags: note.tags }),
      });
      if (!res.ok) throw new Error("Failed to update note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setEditingNote(null);
      setContent("");
      toast.success("Note updated successfully!");
    },
  });

  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, is_todo }: { id: string; is_todo: boolean }) => {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_todo }),
      });
      if (!res.ok) throw new Error("Failed to update note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note updated successfully!");
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_pinned }),
      });
      if (!res.ok) throw new Error("Failed to update note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success(
        `Note ${togglePinMutation.variables?.is_pinned ? "pinned" : "unpinned"} successfully!`
      );
    },
  });

  // 处理双击编辑
  const handleDoubleClick = (note: Note) => {
    setEditingNote(note);
    setContent(note.content);
  };

  // 处理更新笔记
  const handleUpdate = () => {
    if (!editingNote || !content.trim()) return;
    const tags = parseTags(content);
    updateNoteMutation.mutate({ id: editingNote.id, content, tags });
  };

  // 在光标位置插入文本
  const insertAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end);

    setContent(before + textToInsert + after);
    
    // 设置光标位置
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // 处理工具栏按钮点击
  const handleToolbarClick = (type: string) => {
    switch (type) {
      case 'tag':
        insertAtCursor('#');
        break;
      case 'image':
        insertAtCursor('![image description](image-url)');
        break;
      case 'link':
        insertAtCursor('[link text](url)');
        break;
      case 'attachment':
        insertAtCursor('📎 ');
        break;
      case 'location':
        insertAtCursor('📍 ');
        break;
      case 'todo':
        insertAtCursor('- [ ] ');
        break;
    }
  };

  // 解析内容中的标签
  const parseTags = (text: string): string[] => {
    const tagRegex = /#([a-zA-Z0-9\u4e00-\u9fa5_-]+)/g;
    const matches = text.match(tagRegex) || [];
    return matches.map(tag => tag.slice(1));
  };

  // 处理保存
  const handleSave = () => {
    if (!content.trim()) {
      toast.error("Content cannot be empty");
      return;
    }
    const tags = parseTags(content);
    createNoteMutation.mutate({ content, tags });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="max-w-3xl mx-auto p-4">
        {/* 编辑器部分 */}
        <div className="bg-white rounded-lg shadow mb-4">
          <div className="p-4">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Any thoughts..."
              className="w-full resize-none border-0 focus:ring-0 p-0 text-lg"
              rows={3}
            />
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-2">
                <button 
                  onClick={() => handleToolbarClick('todo')}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Add todo item"
                >
                  <FiCheckSquare className="text-gray-600" />
                </button>
                <button 
                  onClick={() => handleToolbarClick('tag')}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Add tag"
                >
                  <FiHash className="text-gray-600" />
                </button>
                <button 
                  onClick={() => handleToolbarClick('image')}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Insert image"
                >
                  <FiImage className="text-gray-600" />
                </button>
                <button 
                  onClick={() => handleToolbarClick('attachment')}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Add attachment"
                >
                  <FiPaperclip className="text-gray-600" />
                </button>
                <button 
                  onClick={() => handleToolbarClick('link')}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Insert link"
                >
                  <FiLink className="text-gray-600" />
                </button>
                <button 
                  onClick={() => handleToolbarClick('location')}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Add location"
                >
                  <FiMapPin className="text-gray-600" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <FiLock /> Private
                </div>
                <button 
                  onClick={editingNote ? handleUpdate : handleSave}
                  disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50"
                >
                  {editingNote ? (updateNoteMutation.isPending ? "Updating..." : "Update") 
                    : (createNoteMutation.isPending ? "Saving..." : "Save")}
                </button>
                {editingNote && (
                  <button
                    onClick={() => {
                      setEditingNote(null);
                      setContent("");
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 活跃的过滤器 */}
        {(searchQuery || selectedDate || selectedTag || filterType !== 'all') && (
          <div className="mb-4 flex gap-2">
            {filterType !== 'all' && (
              <button
                onClick={() => setFilterType('all')}
                className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {filterType === 'pinned' ? 'Pinned' : 'Todo'} notes
                <FiX className="w-4 h-4" />
              </button>
            )}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                Search: {searchQuery}
                <FiX className="w-4 h-4" />
              </button>
            )}
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                Date: {format(selectedDate, "PPpp")}
                <FiX className="w-4 h-4" />
              </button>
            )}
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                Tag: {selectedTag}
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* 笔记列表 */}
        <div className="space-y-4">
          {sortedNotes.map((note: Note) => (
            <div 
              key={note.id} 
              className={`bg-white rounded-lg shadow p-4 ${note.is_pinned ? 'border-l-4 border-yellow-400' : ''}`}
              onDoubleClick={() => handleDoubleClick(note)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {note.is_pinned && (
                      <span className="text-yellow-600 text-sm flex items-center gap-1">
                        <FiBookmark /> Pinned
                      </span>
                    )}
                    {note.is_todo && (
                      <span className="text-blue-600 text-sm flex items-center gap-1">
                        <FiCheckSquare /> Todo
                      </span>
                    )}
                  </div>
                  <div
                    className={`prose max-w-none ${note.is_todo ? 'todo-content' : ''}`}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(md.render(note.content)),
                    }}
                  />
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(note.tags as string[]).map(tag => (
                        <button
                          key={tag}
                          onClick={() => setSelectedTag(tag)}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <FiHash />
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setShowDropdown(showDropdown === note.id ? null : note.id)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <FiMoreVertical />
                  </button>
                  {showDropdown === note.id && (
                    <div 
                      ref={dropdownRef}
                      className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg py-1 z-10"
                    >
                      <button
                        onClick={() => {
                          handleDoubleClick(note);
                          setShowDropdown(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FiEdit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          togglePinMutation.mutate({ id: note.id, is_pinned: !note.is_pinned });
                          setShowDropdown(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FiBookmark className="w-4 h-4" />
                        {note.is_pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button
                        onClick={() => {
                          toggleTodoMutation.mutate({ id: note.id, is_todo: !note.is_todo });
                          setShowDropdown(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FiCheckSquare className="w-4 h-4" />
                        {note.is_todo ? 'Remove Todo' : 'Mark as Todo'}
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this note?')) {
                            deleteNoteMutation.mutate(note.id);
                          }
                          setShowDropdown(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FiTrash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span>{format(new Date(note.created_at), "PPpp")}</span>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1 hover:text-gray-700">
                    <FiMessageSquare />
                    <span>2</span>
                  </button>
                  <button className="hover:text-gray-700">
                    <FiStar />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  console.log('App component rendered');
  useEffect(() => {
    console.log('App component mounted');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen">
        <Sidebar />
        <MainContent />
      </div>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}

export default App;
