import React, { useState, useEffect, useRef } from "react";
import { 
  FiBookmark, 
  FiCheckSquare, 
  FiX, 
  FiPlus,
  FiImage,
  FiLink,
  FiCode,
  FiEye,
  FiEyeOff,
  FiSave,
  FiClock,
  FiTrash2
} from "react-icons/fi";
import Markdown from 'marked-react';
import { format } from 'date-fns';
import { Note } from '../api';
import { notesApi } from '../api';

export const MainContent: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [preview, setPreview] = useState(false);
  const [content, setContent] = useState('');
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const data = await notesApi.getAll();
        setNotes(data);
      } catch (error) {
        console.error('Failed to fetch notes:', error);
      }
    };

    fetchNotes();
  }, []);

  // 监听搜索事件
  useEffect(() => {
    const handleSearch = (e: CustomEvent) => {
      setSearchQuery(e.detail.query);
    };
    const handleDateSelect = (e: CustomEvent) => {
      setSelectedDate(e.detail.date);
    };
    const handleTagSelect = (e: CustomEvent) => {
      const tag = e.detail.tag;
      if (tag === null) {
        setSelectedTags([]);
      } else if (!selectedTags.includes(tag)) {
        setSelectedTags(prev => [...prev, tag]);
      }
    };

    window.addEventListener('search', handleSearch as EventListener);
    window.addEventListener('dateSelect', handleDateSelect as EventListener);
    window.addEventListener('tagSelect', handleTagSelect as EventListener);

    return () => {
      window.removeEventListener('search', handleSearch as EventListener);
      window.removeEventListener('dateSelect', handleDateSelect as EventListener);
      window.removeEventListener('tagSelect', handleTagSelect as EventListener);
    };
  }, [selectedTags]);

  const formatDate = (timestamp: number) => {
    // 转换 10 位时间戳为 Date 对象
    const date = new Date(timestamp * 1000);
    return format(date, 'yyyy-MM-dd HH:mm:ss');
  };

  const filteredNotes = notes.filter((note: Note) => {
    const matchesSearch = !searchQuery || note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = !selectedDate || new Date(note.created_at * 1000).toDateString() === selectedDate.toDateString();
    const noteTags = typeof note.tags === 'string' ? JSON.parse(note.tags) : note.tags;
    const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => noteTags.includes(tag));
    return matchesSearch && matchesDate && matchesTags;
  }).sort((a, b) => {
    // 按时间戳降序排序
    return b.created_at - a.created_at;
  });

  const handleDelete = async (id: string) => {
    setDeleteNoteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteNoteId) return;
    
    try {
      await notesApi.delete(deleteNoteId);
      setNotes(prev => prev.filter(note => note.id !== deleteNoteId));
      window.dispatchEvent(new CustomEvent('noteChange'));
    } catch (error) {
      console.error('Failed to delete note:', error);
    } finally {
      setDeleteNoteId(null);
    }
  };

  const handleToggleTodo = async (id: string, is_todo: boolean) => {
    try {
      const updatedNote = await notesApi.toggleTodo({ id, is_todo });
      setNotes(prev => prev.map(note => 
        note.id === id ? updatedNote : note
      ));
      window.dispatchEvent(new CustomEvent('noteChange'));
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const handleTogglePin = async (id: string, is_pinned: boolean) => {
    try {
      const updatedNote = await notesApi.togglePin({ id, is_pinned });
      setNotes(prev => prev.map(note => 
        note.id === id ? updatedNote : note
      ));
      window.dispatchEvent(new CustomEvent('noteChange'));
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleNewNote = () => {
    setEditingNote(null);
    setIsEditing(true);
    setContent('');
    setPreview(false);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsEditing(true);
    setContent(note.content);
    setPreview(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingNote(null);
    setContent('');
    setPreview(false);
  };

  const handleSaveNote = async () => {
    if (!content.trim()) return;

    try {
      const tagRegex = /#([a-zA-Z0-9\u4e00-\u9fa5_-]+)/g;
      const tags = Array.from(content.matchAll(tagRegex)).map(match => match[1]);

      let savedNote: Note;
      if (editingNote) {
        savedNote = await notesApi.update(editingNote.id, { content, tags });
        setNotes(prev => prev.map(note => note.id === savedNote.id ? savedNote : note));
      } else {
        savedNote = await notesApi.create({ content, tags });
        setNotes(prev => [savedNote, ...prev]);
      }
      setIsEditing(false);
      setEditingNote(null);
      setContent('');
      setPreview(false);
      window.dispatchEvent(new CustomEvent('noteChange'));
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newContent = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newContent);
    
    // 设置光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        end + before.length
      );
    }, 0);
  };

  const parseTags = (tagString: string | string[]): string[] => {
    if (Array.isArray(tagString)) return tagString;
    try {
      const parsed = JSON.parse(tagString || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="mb-4 flex justify-between items-center">
        {selectedTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600">Filtered by:</span>
            <div className="flex gap-2 flex-wrap">
              {selectedTags.map(tag => (
                <span 
                  key={tag}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm cursor-pointer hover:bg-blue-200 flex items-center gap-1"
                  onClick={() => {
                    setSelectedTags(prev => prev.filter(t => t !== tag));
                  }}
                >
                  #{tag}
                  <FiX className="w-4 h-4" />
                </span>
              ))}
              <button
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setSelectedTags([]);
                  window.dispatchEvent(new CustomEvent('tagSelect', { detail: { tag: null } }));
                }}
              >
                Clear all
              </button>
            </div>
          </div>
        )}
        <button
          onClick={handleNewNote}
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
        >
          <FiPlus /> New Note
        </button>
      </div>

      {isEditing && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{editingNote ? "Edit Note" : "New Note"}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setPreview(!preview)}
                className="text-gray-600 hover:text-gray-800 p-2"
                title={preview ? "Edit" : "Preview"}
              >
                {preview ? <FiEyeOff /> : <FiEye />}
              </button>
              <button
                onClick={handleSaveNote}
                className="text-gray-600 hover:text-gray-800 p-2"
                title="Save"
              >
                <FiSave />
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-gray-500 hover:text-gray-700 p-2"
                title="Close"
              >
                <FiX />
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-2">
            <button
              onClick={() => insertText('![Image](', ')')}
              className="text-gray-600 hover:text-gray-800 p-2"
              title="Insert Image"
            >
              <FiImage />
            </button>
            <button
              onClick={() => insertText('[', ']()')}
              className="text-gray-600 hover:text-gray-800 p-2"
              title="Insert Link"
            >
              <FiLink />
            </button>
            <button
              onClick={() => insertText('```\n', '\n```')}
              className="text-gray-600 hover:text-gray-800 p-2"
              title="Insert Code Block"
            >
              <FiCode />
            </button>
            <button
              onClick={() => insertText('- [ ] ')}
              className="text-gray-600 hover:text-gray-800 p-2"
              title="Insert Todo"
            >
              <FiCheckSquare />
            </button>
          </div>

          {preview ? (
            <div className="prose max-w-none p-4 border rounded">
              <Markdown>{content}</Markdown>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-[calc(100vh-20rem)] p-4 border rounded font-mono"
              placeholder="Write your note here... Use #tag to add tags"
            />
          )}
        </div>
      )}

      {deleteNoteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium mb-4">Delete Note</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this note? This action cannot be undone.</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setDeleteNoteId(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredNotes.length > 0 ? (
        <div className="space-y-4">
          {filteredNotes.map((note: Note) => (
            <div 
              key={note.id} 
              className={`bg-white rounded-lg shadow p-4 ${note.is_pinned ? 'border-l-4 border-yellow-400' : ''}`}
              onDoubleClick={() => handleEditNote(note)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div 
                    className={`prose max-w-none ${note.is_todo ? 'todo-content' : ''}`}
                  >
                    <Markdown>{note.content}</Markdown>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {parseTags(note.tags).map((tag: string) => (
                      <span 
                        key={tag} 
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm cursor-pointer hover:bg-blue-200"
                        onClick={() => window.dispatchEvent(new CustomEvent('tagSelect', { detail: { tag } }))}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                    <FiClock className="w-4 h-4" />
                    <span>{formatDate(note.created_at)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleTogglePin(note.id, !note.is_pinned)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title={note.is_pinned ? "Unpin" : "Pin"}
                  >
                    <FiBookmark className={`w-5 h-5 ${note.is_pinned ? 'text-yellow-500' : ''}`} />
                  </button>
                  <button 
                    onClick={() => handleToggleTodo(note.id, !note.is_todo)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title={note.is_todo ? "Mark as Regular" : "Mark as Todo"}
                  >
                    <FiCheckSquare className={`w-5 h-5 ${note.is_todo ? 'text-green-500' : ''}`} />
                  </button>
                  <button 
                    onClick={() => handleDelete(note.id)}
                    className="text-gray-400 hover:text-red-600 p-1"
                    title="Delete"
                  >
                    <FiTrash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 mt-10">
          Select a note to view or create a new one
        </div>
      )}
    </div>
  );
}; 