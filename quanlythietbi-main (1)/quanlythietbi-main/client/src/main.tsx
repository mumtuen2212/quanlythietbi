import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Bắt lỗi JS toàn cục trên điện thoại
window.addEventListener('error', (e) => {
  alert('Lỗi JS: ' + e.message + '\nTại: ' + e.filename);
});
window.addEventListener('unhandledrejection', (e) => {
  alert('Lỗi API/Promise: ' + e.reason);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);