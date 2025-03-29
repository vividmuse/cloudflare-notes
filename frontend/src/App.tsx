import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import "./App.css";
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { LoginPage } from './components/LoginPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';

console.log('App.tsx loaded');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// 主应用内容组件
function AppContent() {
  const { user } = useAuth();

  // 如果没有用户登录，显示登录页面
  if (!user) {
    return <LoginPage />;
  }

  // 用户已登录，显示主应用
  return (
    <div className="flex h-screen">
      <Sidebar />
      <MainContent />
    </div>
  );
}

// 修改 App 组件
function App() {
  console.log('App component rendered');
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}

export default App;
