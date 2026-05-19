import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import DailyLogs from '@/pages/DailyLogs';
import DailyLogDetail from '@/pages/DailyLogDetail';
import AssetChecklist from '@/pages/AssetChecklist';
import PunchList from '@/pages/PunchList';
import Settings from '@/pages/Settings';

// Protects all app routes — redirects to /login if not authenticated
function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );
  return session ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />

      {/* Protected */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/"                                   element={<Projects />} />
        <Route path="/project/:projectId"                 element={<ProjectDetail />} />
        <Route path="/project/:projectId/logs"            element={<DailyLogs />} />
        <Route path="/project/:projectId/log/:logId"      element={<DailyLogDetail />} />
        <Route path="/project/:projectId/assets"          element={<AssetChecklist />} />
        <Route path="/project/:projectId/punch"           element={<PunchList />} />
        <Route path="/settings"                           element={<Settings />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
