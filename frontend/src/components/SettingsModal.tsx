import React, { useState, useEffect } from 'react';
import { FiX, FiUser, FiMoon, FiSun, FiSave, FiCopy, FiShield, FiPlus, FiTrash2 } from 'react-icons/fi';
import { authApi, systemApi, accessTokenApi, type User, type AccessToken } from '../api';

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
  // 用户资料设置
  const [nickname, setNickname] = useState(user.nickname || '');
  const [email, setEmail] = useState(user.email || '');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // 外观设置
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  
  // 管理员设置
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [isUpdatingAdminSettings, setIsUpdatingAdminSettings] = useState(false);
  
  // Access Token 管理
  const [accessTokens, setAccessTokens] = useState<AccessToken[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [showCreateTokenForm, setShowCreateTokenForm] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenExpiry, setNewTokenExpiry] = useState('');
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  
  // 检查是否为管理员
  const isAdmin = user.role === 'HOST' || user.role === 'ADMIN';

  // 初始化设置
  useEffect(() => {
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
        
        // 加载 access tokens
        await loadAccessTokens();
      }
    };

    initializeSettings();
  }, [isOpen, isAdmin]);

  // 加载 Access Tokens
  const loadAccessTokens = async () => {
    setIsLoadingTokens(true);
    try {
      const response = await accessTokenApi.getAll();
      setAccessTokens(response.accessTokens);
    } catch (error) {
      console.error('Failed to load access tokens:', error);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  // 保存用户资料
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

  // 创建新的 Access Token
  const handleCreateToken = async () => {
    if (!newTokenName.trim() || !newTokenExpiry) {
      alert('请填写完整的token信息');
      return;
    }

    setIsCreatingToken(true);
    try {
      const response = await accessTokenApi.create({
        name: newTokenName.trim(),
        expiresAt: newTokenExpiry,
      });
      
      setCreatedToken(response.accessToken);
      setNewTokenName('');
      setNewTokenExpiry('');
      setShowCreateTokenForm(false);
      await loadAccessTokens(); // 重新加载列表
      
      alert('Access Token 创建成功！');
    } catch (error) {
      console.error('Failed to create access token:', error);
      alert('创建 Access Token 失败，请重试');
    } finally {
      setIsCreatingToken(false);
    }
  };

  // 删除 Access Token
  const handleDeleteToken = async (tokenId: number, tokenName: string) => {
    if (!confirm(`确定要删除 "${tokenName}" 吗？此操作无法撤销。`)) {
      return;
    }

    try {
      await accessTokenApi.delete(tokenId);
      await loadAccessTokens(); // 重新加载列表
      alert('Access Token 已删除');
    } catch (error) {
      console.error('Failed to delete access token:', error);
      alert('删除 Access Token 失败，请重试');
    }
  };

  // 计算默认过期时间（30天后）
  const getDefaultExpiryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
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

          {/* Access Token 管理 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900 flex items-center">
                🔑 Access Tokens
              </h3>
              <button
                onClick={() => setShowCreateTokenForm(!showCreateTokenForm)}
                className="flex items-center px-3 py-1 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                <FiPlus className="w-3 h-3 mr-1" />
                创建
              </button>
            </div>
            
            <p className="text-xs text-gray-600 mb-4">
              Access tokens 用于移动端应用或第三方工具访问您的数据。每个 token 都有独立的过期时间。
            </p>

            {/* 创建新 Token 表单 */}
            {showCreateTokenForm && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">创建新的 Access Token</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      描述
                    </label>
                    <input
                      type="text"
                      value={newTokenName}
                      onChange={(e) => setNewTokenName(e.target.value)}
                      placeholder="例如：iOS App、第三方工具..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      过期时间
                    </label>
                    <input
                      type="date"
                      value={newTokenExpiry}
                      onChange={(e) => setNewTokenExpiry(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      defaultValue={getDefaultExpiryDate()}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCreateToken}
                      disabled={isCreatingToken}
                      className="flex-1 px-3 py-2 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isCreatingToken ? '创建中...' : '创建 Token'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateTokenForm(false);
                        setNewTokenName('');
                        setNewTokenExpiry('');
                      }}
                      className="flex-1 px-3 py-2 text-xs bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 显示新创建的 Token */}
            {createdToken && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                <h4 className="text-sm font-medium text-green-900 mb-2">Token 创建成功！</h4>
                <p className="text-xs text-green-800 mb-2">请复制并保存此 token，它只会显示一次：</p>
                <div className="flex">
                  <input
                    type="text"
                    value={createdToken}
                    readOnly
                    className="flex-1 px-3 py-2 text-xs border border-green-300 rounded-l-md bg-white font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdToken);
                      alert('Token 已复制到剪贴板');
                    }}
                    className="px-3 py-2 bg-green-100 border border-l-0 border-green-300 rounded-r-md text-green-700 hover:bg-green-200"
                  >
                    <FiCopy className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setCreatedToken(null)}
                  className="mt-2 px-3 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  我已保存，关闭此消息
                </button>
              </div>
            )}

            {/* Token 列表 */}
            <div className="space-y-2">
              {isLoadingTokens ? (
                <div className="text-center text-gray-500 py-4">加载中...</div>
              ) : accessTokens.length === 0 ? (
                <div className="text-center text-gray-500 py-4">暂无 Access Tokens</div>
              ) : (
                accessTokens.map((token) => (
                  <div key={token.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{token.name}</div>
                      <div className="text-xs text-gray-500">
                        创建时间：{new Date(token.createdAt).toLocaleDateString('zh-CN')}
                      </div>
                      <div className="text-xs text-gray-500">
                        过期时间：{new Date(token.expiresAt).toLocaleDateString('zh-CN')}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteToken(token.id, token.name)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                      title="删除 Token"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* 使用说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">使用说明</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• 在移动端应用或第三方工具中使用这些 tokens 进行认证</li>
                <li>• API 基础地址：<code className="bg-blue-100 px-1 rounded">{window.location.origin.replace('cloudflare-notes-1.pages.dev', 'memos-lite.yourmin.workers.dev')}</code></li>
                <li>• 请求头格式：<code className="bg-blue-100 px-1 rounded">Authorization: Bearer &lt;token&gt;</code></li>
                <li>• ⚠️ 请妥善保管 tokens，不要泄露给他人</li>
              </ul>
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
                <div className="text-xs text-gray-500">切换深色主题</div>
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
                    allowRegistration ? 'bg-green-600' : 'bg-red-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      allowRegistration ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={handleAdminSettingsSave}
                disabled={isUpdatingAdminSettings}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {isUpdatingAdminSettings ? '保存中...' : '保存管理员设置'}
              </button>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
          >
            关闭
          </button>
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
          >
            <FiSave className="w-4 h-4 mr-2" />
            {isUpdating ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}; 