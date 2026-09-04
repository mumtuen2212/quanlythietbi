import React from 'react';
// ✅ Đã đổi BrowserRouter -> HashRouter để tương thích với Android WebView
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { RoomDetailPage } from './pages/RoomDetailPage';
import { DeviceDetailPage } from './pages/DeviceDetailPage';
import { QRScannerPage } from './pages/QRScannerPage';
import { ReportIncidentPage } from './pages/ReportIncidentPage';
import { ManualsListPage } from './pages/ManualsListPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

export const App: React.FC = () => {
  const [isTechnicianMode, setIsTechnicianMode] = React.useState(false);

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar
          isTechnicianMode={isTechnicianMode}
          onToggleTechnicianMode={() => setIsTechnicianMode(prev => !prev)}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Routes>
            <Route path="/" element={<HomePage isTechnicianMode={isTechnicianMode} />} />
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
  );
};
export default App;