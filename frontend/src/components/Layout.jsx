import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export const Layout = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 via-blue-50/30 to-white text-gray-900">
      <Navbar />
      <main className="w-full max-w-[2000px] mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-standard animate-fadeIn">
        <Outlet />
      </main>
    </div>
  );
}; 