import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from './components/common';
import { Header } from './components/Header';
import { SymbolSearch } from './components/SymbolSearch';
import ChartPage from './pages/ChartPage';
import Home from './pages/Home';
import Screener from './pages/Screener';
import { openSearch, settingsStore } from './store/app';
import { useStore } from './store/store';

export default function App() {
  const { colorMode } = useStore(settingsStore);

  useEffect(() => {
    document.documentElement.dataset.colors = colorMode;
  }, [colorMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch('navigate');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <main className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/chart/:symbol?" element={<ChartPage />} />
            <Route path="/screener" element={<Screener />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <SymbolSearch />
        <Toaster />
      </div>
    </BrowserRouter>
  );
}
