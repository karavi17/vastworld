import { Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import Home from './pages/Home';
import Search from './pages/Search';
import Watch from './pages/Watch';
import Downloads from './pages/Downloads';
import WatchLater from './pages/WatchLater';
import Shorts from './pages/Shorts';
import { useUI } from './context/UIContext';
import { useEffect } from 'react';

function App() {
  const { isSidebarOpen } = useUI();
  const location = useLocation();
  const isShortsPage = location.pathname === '/shorts';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <Navbar />
      <Sidebar />
      <main className={`pt-14 transition-all duration-300 ${isSidebarOpen ? 'md:ml-60' : 'ml-0'} ${isShortsPage ? 'px-0' : 'px-4 sm:px-6'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/watch" element={<Watch />} />
          <Route path="/shorts" element={<Shorts />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/watch-later" element={<WatchLater />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
