import React from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, Users, Calendar, FileText, Package, 
  Microscope, MessageSquare, ClipboardList, LogOut, Menu, X,
  Clock, DollarSign, FolderKanban, BookOpen, Pen, Clipboard
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

import { BACKEND_URL } from '@/config';

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/auth/me`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => navigate('/'));
  }, [navigate]);

  const handleLogout = async () => {
    await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    navigate('/');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/app', exact: true },
    { icon: Clipboard, label: 'Work Assignments', path: '/app/work-assignments' },
    { icon: Users, label: 'Employees', path: '/app/employees', roles: ['Admin', 'HR'] },
    { icon: Clock, label: 'Attendance', path: '/app/attendance' },
    { icon: FileText, label: 'Leave Requests', path: '/app/leave-requests' },
    { icon: DollarSign, label: 'Payroll', path: '/app/payroll', roles: ['Admin', 'HR', 'Accountant'] },
    { icon: DollarSign, label: 'Payment Requests', path: '/app/payment-requests', roles: ['Admin', 'Accountant', 'CA'] },
    { icon: FolderKanban, label: 'Projects', path: '/app/projects' },
    { icon: Microscope, label: 'Lab Notebook', path: '/app/lab-notebook' },
    { icon: Package, label: 'Lab Inventory', path: '/app/lab-inventory' },
    { icon: Pen, label: 'Stationary Inventory', path: '/app/stationary-inventory' },
    { icon: Calendar, label: 'Equipment Schedule', path: '/app/equipment-schedule' },
    { icon: MessageSquare, label: 'Chat', path: '/app/chat' },
    { icon: Calendar, label: 'Calendar', path: '/app/calendar' },
    { icon: ClipboardList, label: 'Helpdesk', path: '/app/helpdesk' },
  ];

  const secondaryMenuItems = [
    { icon: BookOpen, label: 'Portal Guide', path: '/app/about' },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-[#163E64] dark:from-slate-950 dark:via-slate-900 dark:to-[#0f2942] transition-colors">
      {/* Header */}
      <header className="bg-slate-800/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-40 transition-colors">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-slate-200">
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <div className="flex items-center space-x-3">
                <img src="/logo.svg" alt="NucleoVir" className="h-9 w-9" />
                <div>
                  <h1 className="text-lg font-heading font-bold text-white">NucleoVir</h1>
                  <p className="text-xs text-slate-400 hidden sm:block">Enterprise Portal</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              {user && (
                <div className="text-sm text-right hidden sm:block">
                  <div className="font-medium text-white">{user.name}</div>
                  <div className="text-slate-400 text-xs">{user.role}</div>
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout} 
                data-testid="logout-btn" 
                className="border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-800/90 dark:bg-slate-900/90 backdrop-blur-md border-r border-slate-700/50 transition-transform duration-300 ease-in-out overflow-y-auto`}>
          <nav className="p-4 space-y-1 mt-16 lg:mt-0">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-[#FF3D33]/20 to-[#215F9A]/20 text-white font-medium border-l-2 border-[#FF3D33]'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-[#FF3D33]' : ''}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            {/* Divider and secondary menu */}
            <div className="pt-4 mt-4 border-t border-slate-700/50">
              {secondaryMenuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path, item.exact);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-gradient-to-r from-[#FF3D33]/20 to-[#215F9A]/20 text-white font-medium border-l-2 border-[#FF3D33]'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? 'text-[#FF3D33]' : ''}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
          <Outlet context={{ user }} />
        </main>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
