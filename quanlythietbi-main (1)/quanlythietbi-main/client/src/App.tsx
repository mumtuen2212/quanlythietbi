import React from 'react';
// ✅ Đã đổi BrowserRouter -> HashRouter để tương thích với Android WebView
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { RoomDetailPage } from './pages/RoomDetailPage';
import { DeviceDetailPage } from './pages/DeviceDetailPage';
import { QRScannerPage } from './pages/QRScannerPage';
import { ReportIncidentPage } from './pages/ReportIncidentPage';
import { ManualsListPage } from './pages/ManualsListPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

export const App: React.FC = () => {
  const [isTechnicianMode, setIsTechnicianMode] = React.useState(false);

  React.useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash !== '#' && !hash.startsWith('#/')) {
      window.location.hash = `#/${hash.slice(1)}`;
    }
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-slate-50">
          <Navbar
            isTechnicianMode={isTechnicianMode}
            onToggleTechnicianMode={() => setIsTechnicianMode(prev => !prev)}
          />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <Routes>
              <Route path="/" element={<HomePage isTechnicianMode={isTechnicianMode} />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/rooms/:id" element={<RoomDetailPage />} />
              <Route path="/devices/:id" element={<DeviceDetailPage />} />
              <Route path="/qr-scanner" element={<QRScannerPage />} />
              <Route path="/report-incident" element={<ReportIncidentPage />} />
              <Route path="/manuals" element={<ManualsListPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
};
export default App;