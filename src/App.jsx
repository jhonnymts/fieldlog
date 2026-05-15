import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { PasswordGate } from '@/lib/PasswordGate';
import AppLayout from '@/components/layout/AppLayout';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import DailyLogs from '@/pages/DailyLogs';
import DailyLogDetail from '@/pages/DailyLogDetail';
import AssetChecklist from '@/pages/AssetChecklist';
import PunchList from '@/pages/PunchList';
import Settings from '@/pages/Settings';

function App() {
  return (
    <PasswordGate>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Projects />} />
              <Route path="/project/:projectId" element={<ProjectDetail />} />
              <Route path="/project/:projectId/logs" element={<DailyLogs />} />
              <Route path="/project/:projectId/log/:logId" element={<DailyLogDetail />} />
              <Route path="/project/:projectId/assets" element={<AssetChecklist />} />
              <Route path="/project/:projectId/punch" element={<PunchList />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </PasswordGate>
  );
}

export default App;