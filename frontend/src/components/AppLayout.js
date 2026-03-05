import React from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, Users, Calendar, FileText, Package, 
  Microscope, MessageSquare, ClipboardList, LogOut, Menu, X,
  Clock, DollarSign, FolderKanban, BookOpen, Pen, Clipboard,
  ShoppingCart, Bell, Check
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

import { BACKEND_URL } from '@/config';

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/auth/me`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(() => navigate('/'));
  }, [navigate]);

  // Fetch procurement notifications periodically
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/notifications?unread_only=true`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
        }
      } catch (error) {
        console.error('Failed to fetch notifications');
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await fetch(`${BACKEND_URL}/api/notifications/${notificationId}/read`, {
        method: 'POST',
        credentials: 'include'
      });
      setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
    } catch (error) {
      console.error('Failed to mark notification read');
    }
  };

  const handleNotificationClick = (notification) => {
    // Navigate to relevant entity
    if (notification.related_entity?.type === 'po') {
      navigate('/app/procurement');
    }
    handleMarkNotificationRead(notification.notification_id);
    setNotifDropdownOpen(false);
  };

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
    { icon: ShoppingCart, label: 'Procurement', path: '/app/procurement', roles: ['Admin', 'CA', 'Director'] },
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-40 transition-colors duration-300">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-gray-700 dark:text-slate-200">
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <div className="flex items-center space-x-3">
                <img src="/logo.svg" alt="NucleoVir" className="h-9 w-9" />
                <div>
                  <h1 className="text-lg font-heading font-bold text-gray-900 dark:text-white">NucleoVir</h1>
                  <p className="text-xs text-gray-500 dark:text-slate-400 hidden sm:block">Enterprise Portal</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <DropdownMenu open={notifDropdownOpen} onOpenChange={setNotifDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="relative p-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    data-testid="notification-bell"
                  >
                    <Bell className="h-5 w-5" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
                        {notifications.length > 9 ? '9+' : notifications.length}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                  <DropdownMenuLabel className="text-gray-900 dark:text-white">Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700" />
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-slate-400 text-sm">
                      No new notifications
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.slice(0, 5).map((notif) => (
                        <DropdownMenuItem 
                          key={notif.notification_id}
                          onClick={() => handleNotificationClick(notif)}
                          className="flex flex-col items-start p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 focus:bg-gray-100 dark:focus:bg-slate-700"
                        >
                          <div className="font-medium text-gray-900 dark:text-white text-sm">{notif.title}</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">{notif.message}</div>
                          <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                            {new Date(notif.created_at).toLocaleString()}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  )}
                  {notifications.length > 5 && (
                    <>
                      <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700" />
                      <DropdownMenuItem 
                        onClick={() => { navigate('/app/procurement'); setNotifDropdownOpen(false); }}
                        className="text-center text-[#215F9A] dark:text-[#6BB5FF] hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer justify-center"
                      >
                        View all notifications
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <ThemeToggle />
              {user && (
                <div className="text-sm text-right hidden sm:block">
                  <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                  <div className="text-gray-500 dark:text-slate-400 text-xs">{user.role}</div>
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout} 
                data-testid="logout-btn" 
                className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
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
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 transition-all duration-300 ease-in-out overflow-y-auto`}>
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
                      ? 'bg-gradient-to-r from-[#FF3D33]/10 to-[#215F9A]/10 dark:from-[#FF3D33]/20 dark:to-[#215F9A]/20 text-[#215F9A] dark:text-white font-medium border-l-2 border-[#FF3D33]'
                      : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-[#FF3D33]' : ''}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-slate-700">
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
                        ? 'bg-gradient-to-r from-[#FF3D33]/10 to-[#215F9A]/10 dark:from-[#FF3D33]/20 dark:to-[#215F9A]/20 text-[#215F9A] dark:text-white font-medium border-l-2 border-[#FF3D33]'
                        : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-white'
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
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
