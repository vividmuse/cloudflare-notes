import React, { useState } from 'react';
import { FiX, FiUser, FiMoon, FiSun, FiSave } from 'react-icons/fi';
import { authApi, type User } from '../api';

interface SettingsModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdate: (user: User) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  user,
  isOpen,
  onClose,
  onUserUpdate
}) => {
  const [nickname, setNickname] = useState(user.nickname || '');
  const [email, setEmail] = useState(user.email || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      const updatedUser = await authApi.updateProfile({
        nickname: nickname.trim() || undefined,
        email: email.trim() || undefined,
      });
      
      // 更新本地存储
      localStorage.setItem('user', JSON.stringify(updatedUser));
      onUserUpdate(updatedUser);
      
      alert('设置已保存');
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('保存失败，请重试');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">设置</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 用户资料 */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <FiUser className="w-4 h-4 mr-2" />
              用户资料
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用户名
                </label>
                <input
                  type="text"
                  value={user.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">用户名无法修改</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  昵称
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="输入你的昵称"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="输入你的邮箱"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  角色
                </label>
                <input
                  type="text"
                  value={user.role === 'HOST' ? '管理员' : user.role === 'ADMIN' ? '管理员' : '用户'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* 外观设置 */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              {darkMode ? <FiMoon className="w-4 h-4 mr-2" /> : <FiSun className="w-4 h-4 mr-2" />}
              外观设置
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">深色模式</div>
                <div className="text-xs text-gray-500">切换深色主题（即将推出）</div>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                disabled
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    darkMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSave className="w-4 h-4" />
            <span>{isUpdating ? '保存中...' : '保存'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}; 