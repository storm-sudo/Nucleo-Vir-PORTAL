import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, ClipboardList, DollarSign, FolderKanban, Package } from 'lucide-react';
import NotificationsBox from '@/components/NotificationsBox';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Dashboard() {
  const { user } = useOutletContext();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/dashboard/stats`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  }, []);

  const widgets = [
    { icon: Users, label: 'Total Employees', value: stats?.total_employees || 0, color: 'text-sky-500', bg: 'bg-sky-50' },
    { icon: FileText, label: 'Pending Leave Requests', value: stats?.pending_leave_requests || 0, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { icon: ClipboardList, label: 'Open Tickets', value: stats?.open_tickets || 0, color: 'text-amber-500', bg: 'bg-amber-50' },
    { icon: DollarSign, label: 'Pending Payments', value: stats?.pending_payment_requests || 0, color: 'text-rose-500', bg: 'bg-rose-50' },
    { icon: FolderKanban, label: 'Active Projects', value: stats?.active_projects || 0, color: 'text-purple-500', bg: 'bg-purple-50' },
    { icon: Package, label: 'Inventory Items', value: stats?.inventory_items || 0, color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  return (
    <div data-testid="dashboard" className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">Welcome back, {user?.name}</p>
      </div>

      {/* Notifications Box */}
      <NotificationsBox user={user} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.map((widget, idx) => {
          const Icon = widget.icon;
          return (
            <Card key={idx} className="border-slate-200 hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{widget.label}</CardTitle>
                <div className={`p-2 rounded-lg ${widget.bg}`}>
                  <Icon className={`h-5 w-5 ${widget.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-heading font-bold text-slate-900">{widget.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-heading">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left">
              <Clock className="h-6 w-6 text-sky-500 mb-2" />
              <div className="font-medium text-slate-900">Mark Attendance</div>
              <div className="text-sm text-slate-500">Clock in for today</div>
            </button>
            <button className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left">
              <FileText className="h-6 w-6 text-emerald-500 mb-2" />
              <div className="font-medium text-slate-900">Request Leave</div>
              <div className="text-sm text-slate-500">Submit a leave request</div>
            </button>
            <button className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left">
              <ClipboardList className="h-6 w-6 text-amber-500 mb-2" />
              <div className="font-medium text-slate-900">Create Ticket</div>
              <div className="text-sm text-slate-500">Get help from support</div>
            </button>
            <button className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left">
              <Package className="h-6 w-6 text-purple-500 mb-2" />
              <div className="font-medium text-slate-900">Request Material</div>
              <div className="text-sm text-slate-500">Lab inventory request</div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Clock } from 'lucide-react';