import React, { useState } from 'react';
import { FiX, FiUser, FiMoon, FiSun, FiSave, FiCopy, FiEye, FiEyeOff, FiShield } from 'react-icons/fi';
import { authApi, systemApi, type User } from '../api';

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
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const [showToken, setShowToken] = useState(false);
  const [accessToken] = useState(localStorage.getItem('accessToken') || '');
  
  // 管理员设置
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [isUpdatingAdminSettings, setIsUpdatingAdminSettings] = useState(false);
  
  // 检查是否为管理员
  const isAdmin = user.role === 'HOST' || user.role === 'ADMIN';

  // 初始化设置
  React.useEffect(() => {
    const initializeSettings = async () => {
      if (isOpen) {
        // 初始化暗黑模式
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        setDarkMode(savedDarkMode);
        
        // 初始化管理员设置
        if (isAdmin) {
          try {
            const adminSettings = await systemApi.getAdminSettings();
            setAllowRegistration(adminSettings.allowRegistration);
          } catch (error) {
            console.error('Failed to load admin settings:', error);
            // 使用localStorage作为后备
            const savedAllowRegistration = localStorage.getItem('allowRegistration');
            setAllowRegistration(savedAllowRegistration !== 'false');
          }
        }
      }
    };
    
    initializeSettings();
  }, [isOpen, isAdmin]);

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

  // 处理暗黑模式切换
  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    // 应用主题到 DOM
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // 处理管理员设置保存
  const handleAdminSettingsSave = async () => {
    setIsUpdatingAdminSettings(true);
    try {
      await systemApi.updateAdminSettings({ allowRegistration });
      
      // 同时更新localStorage作为缓存
      localStorage.setItem('allowRegistration', allowRegistration.toString());
      
      alert('管理员设置已保存');
    } catch (error) {
      console.error('Failed to save admin settings:', error);
      alert('保存管理员设置失败，请重试');
    } finally {
      setIsUpdatingAdminSettings(false);
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

          {/* API Access Token */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              🔑 API Access Token
            </h3>
            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                用于移动端应用或第三方工具访问您的数据
              </p>
              
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  当前 Token
                </label>
                <div className="flex">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={accessToken}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-gray-600 font-mono text-xs"
                    placeholder="未找到 Token"
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="px-3 py-2 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 hover:text-gray-700"
                    title={showToken ? '隐藏 Token' : '显示 Token'}
                  >
                    {showToken ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(accessToken);
                      alert('Token 已复制到剪贴板');
                    }}
                    disabled={!accessToken}
                    className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="复制 Token"
                  >
                    <FiCopy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <h4 className="text-sm font-medium text-blue-900 mb-2">使用说明</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• 在移动端应用中设置此 Token 作为认证凭证</li>
                  <li>• API 基础地址：<code className="bg-blue-100 px-1 rounded">https://memos-lite.yourmin.workers.dev</code></li>
                  <li>• 请求头格式：<code className="bg-blue-100 px-1 rounded">Authorization: Bearer &lt;token&gt;</code></li>
                  <li>• ⚠️ 请妥善保管，不要泄露给他人</li>
                </ul>
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
                <div className="text-xs text-gray-500">切换深色主题外观</div>
              </div>
              <button
                onClick={handleDarkModeToggle}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
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

          {/* 管理员设置 - 仅管理员可见 */}
          {isAdmin && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <FiShield className="w-4 h-4 mr-2" />
                管理员设置
              </h3>
              
              {/* 允许注册开关 */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-medium text-gray-700">允许用户注册</div>
                  <div className="text-xs text-gray-500">控制是否允许新用户注册账号</div>
                </div>
                <button
                  onClick={() => setAllowRegistration(!allowRegistration)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    allowRegistration ? 'bg-green-600' : 'bg-red-400'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      allowRegistration ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleAdminSettingsSave}
                  disabled={isUpdatingAdminSettings}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdatingAdminSettings ? '保存中...' : '保存管理员设置'}
                </button>
              </div>
            </div>
          )}
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