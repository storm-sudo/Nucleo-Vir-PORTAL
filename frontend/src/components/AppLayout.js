import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, Users, Calendar, FileText, Package, 
  Microscope, MessageSquare, ClipboardList, LogOut, Menu, X,
  Clock, DollarSign, FolderKanban
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

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
    { icon: Users, label: 'Employees', path: '/app/employees', roles: ['Admin', 'HR'] },
    { icon: Clock, label: 'Attendance', path: '/app/attendance' },
    { icon: FileText, label: 'Leave Requests', path: '/app/leave-requests' },
    { icon: DollarSign, label: 'Payroll', path: '/app/payroll', roles: ['Admin', 'HR', 'Accountant'] },
    { icon: DollarSign, label: 'Payment Requests', path: '/app/payment-requests', roles: ['Admin', 'Accountant', 'CA'] },
    { icon: FolderKanban, label: 'Projects', path: '/app/projects' },
    { icon: Microscope, label: 'Lab Notebook', path: '/app/lab-notebook' },
    { icon: Package, label: 'Lab Inventory', path: '/app/lab-inventory' },
    { icon: Calendar, label: 'Equipment Schedule', path: '/app/equipment-schedule' },
    { icon: MessageSquare, label: 'Chat', path: '/app/chat' },
    { icon: Calendar, label: 'Calendar', path: '/app/calendar' },
    { icon: ClipboardList, label: 'Helpdesk', path: '/app/helpdesk' },
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <h1 className="text-lg font-heading font-bold text-slate-900">Nucleo-vir Therapeutics</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="text-sm text-right hidden sm:block">
                  <div className="font-medium text-slate-900">{user.name}</div>
                  <div className="text-slate-500 text-xs">{user.role}</div>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout} data-testid="logout-btn">
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
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out overflow-y-auto`}>
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
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                    active
                      ? 'bg-sky-50 text-sky-600 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet context={{ user }} />
        </main>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}