import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, FileText, ClipboardList, DollarSign, FolderKanban, Package, Clock, Settings } from 'lucide-react';
import NotificationsBox from '@/components/NotificationsBox';
import QuickActionsCustomizer, { ALL_QUICK_ACTIONS } from '@/components/QuickActionsCustomizer';
import { toast } from 'sonner';
import { BACKEND_URL } from '@/config';

export default function Dashboard() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [quickActions, setQuickActions] = useState(['mark_attendance', 'request_leave', 'create_ticket', 'request_material']);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [leaveData, setLeaveData] = useState({ leave_type: '', start_date: '', end_date: '', reason: '' });
  const [ticketData, setTicketData] = useState({ subject: '', description: '', category: 'Technical', priority: 'Medium' });

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/dashboard/stats`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
    
    fetch(`${BACKEND_URL}/api/user/preferences`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.quick_actions && data.quick_actions.length > 0) {
          setQuickActions(data.quick_actions);
        }
      })
      .catch(console.error);
  }, []);

  const widgets = [
    { icon: Users, label: 'Total Employees', value: stats?.total_employees || 0, color: 'bg-red-500', lightBg: 'bg-red-50 dark:bg-red-500/10' },
    { icon: FileText, label: 'Pending Leave', value: stats?.pending_leave_requests || 0, color: 'bg-blue-500', lightBg: 'bg-blue-50 dark:bg-blue-500/10' },
    { icon: ClipboardList, label: 'Open Tickets', value: stats?.open_tickets || 0, color: 'bg-amber-500', lightBg: 'bg-amber-50 dark:bg-amber-500/10' },
    { icon: DollarSign, label: 'Pending Payments', value: stats?.pending_payment_requests || 0, color: 'bg-emerald-500', lightBg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { icon: FolderKanban, label: 'Active Projects', value: stats?.active_projects || 0, color: 'bg-purple-500', lightBg: 'bg-purple-50 dark:bg-purple-500/10' },
    { icon: Package, label: 'Inventory Items', value: stats?.inventory_items || 0, color: 'bg-cyan-500', lightBg: 'bg-cyan-50 dark:bg-cyan-500/10' },
  ];

  const handleMarkAttendance = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'Present' })
      });
      if (response.ok) toast.success('Attendance marked successfully!');
      else { const data = await response.json(); toast.error(data.detail || 'Failed to mark attendance'); }
    } catch (error) { toast.error('An error occurred'); }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/leave-requests`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(leaveData)
      });
      if (response.ok) { toast.success('Leave request submitted!'); setLeaveDialogOpen(false); setLeaveData({ leave_type: '', start_date: '', end_date: '', reason: '' }); }
      else toast.error('Failed to submit leave request');
    } catch (error) { toast.error('An error occurred'); }
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/helpdesk/tickets`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(ticketData)
      });
      if (response.ok) { toast.success('Ticket created successfully!'); setTicketDialogOpen(false); setTicketData({ subject: '', description: '', category: 'Technical', priority: 'Medium' }); }
      else toast.error('Failed to create ticket');
    } catch (error) { toast.error('An error occurred'); }
  };

  const executeQuickAction = (actionId) => {
    switch (actionId) {
      case 'mark_attendance': handleMarkAttendance(); break;
      case 'request_leave': setLeaveDialogOpen(true); break;
      case 'create_ticket': setTicketDialogOpen(true); break;
      case 'request_material': navigate('/app/lab-inventory'); break;
      case 'book_equipment': navigate('/app/equipment-schedule'); break;
      case 'open_chat': navigate('/app/chat'); break;
      case 'view_payroll': navigate('/app/payroll'); break;
      case 'lab_notebook': navigate('/app/lab-notebook'); break;
      default: break;
    }
  };

  const getActionDetails = (actionId) => ALL_QUICK_ACTIONS.find(a => a.id === actionId) || {};
  const getActionDescription = (actionId) => {
    const descriptions = { mark_attendance: 'Clock in for today', request_leave: 'Submit a leave request', create_ticket: 'Get help from support', request_material: 'Lab inventory request', book_equipment: 'Reserve lab equipment', open_chat: 'Message your team', view_payroll: 'Check payroll records', lab_notebook: 'Record experiments' };
    return descriptions[actionId] || '';
  };

  return (
    <div data-testid="dashboard" className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
        <p className="text-gray-600 dark:text-slate-400">Welcome back, {user?.name}</p>
      </div>

      <NotificationsBox user={user} />

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {widgets.map((widget, idx) => {
          const Icon = widget.icon;
          return (
            <Card key={idx} className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">{widget.label}</p>
                    <p className="text-3xl font-heading font-bold text-gray-900 dark:text-white">{widget.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${widget.color} shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-heading text-gray-900 dark:text-white">Quick Actions</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setCustomizerOpen(true)} className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700">
            <Settings className="h-4 w-4 mr-1" />Customize
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((actionId) => {
              const action = getActionDetails(actionId);
              const Icon = action.icon || Clock;
              return (
                <button
                  key={actionId}
                  onClick={() => executeQuickAction(actionId)}
                  className="p-4 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl hover:bg-gradient-to-r hover:from-[#FF3D33]/5 hover:to-[#215F9A]/5 dark:hover:from-[#FF3D33]/10 dark:hover:to-[#215F9A]/10 hover:border-[#215F9A]/30 transition-all duration-300 text-left group"
                >
                  <div className="p-2 rounded-lg bg-gradient-to-br from-[#FF3D33] to-[#215F9A] w-fit mb-3 group-hover:scale-110 transition-transform">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="font-medium text-gray-900 dark:text-white">{action.label}</div>
                  <div className="text-sm text-gray-500 dark:text-slate-400">{getActionDescription(actionId)}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <QuickActionsCustomizer open={customizerOpen} onOpenChange={setCustomizerOpen} selectedActions={quickActions} onSave={setQuickActions} />

      {/* Leave Request Dialog */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <DialogHeader><DialogTitle className="text-gray-900 dark:text-white">Request Leave</DialogTitle></DialogHeader>
          <form onSubmit={handleLeaveSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Leave Type</label>
              <Select value={leaveData.leave_type} onValueChange={(val) => setLeaveData({...leaveData, leave_type: val})}>
                <SelectTrigger className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"><SelectValue placeholder="Select leave type" /></SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                  <SelectItem value="Earned Leave">Earned / Privilege Leave (EL/PL)</SelectItem>
                  <SelectItem value="Casual Leave">Casual Leave (CL)</SelectItem>
                  <SelectItem value="Sick Leave">Sick Leave (SL)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Start Date</label><Input type="date" value={leaveData.start_date} onChange={(e) => setLeaveData({...leaveData, start_date: e.target.value})} required className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">End Date</label><Input type="date" value={leaveData.end_date} onChange={(e) => setLeaveData({...leaveData, end_date: e.target.value})} required className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Reason</label><Textarea value={leaveData.reason} onChange={(e) => setLeaveData({...leaveData, reason: e.target.value})} required rows={3} className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" /></div>
            <Button type="submit" className="w-full bg-gradient-to-r from-[#FF3D33] to-[#215F9A] hover:from-[#e63529] hover:to-[#1a4d7a] text-white border-0">Submit Request</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ticket Dialog */}
      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <DialogHeader><DialogTitle className="text-gray-900 dark:text-white">Create Support Ticket</DialogTitle></DialogHeader>
          <form onSubmit={handleTicketSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Subject</label><Input value={ticketData.subject} onChange={(e) => setTicketData({...ticketData, subject: e.target.value})} required className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Category</label>
              <Select value={ticketData.category} onValueChange={(val) => setTicketData({...ticketData, category: val})}>
                <SelectTrigger className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"><SelectItem value="Technical">Technical</SelectItem><SelectItem value="HR">HR</SelectItem><SelectItem value="Admin">Admin</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Priority</label>
              <Select value={ticketData.priority} onValueChange={(val) => setTicketData({...ticketData, priority: val})}>
                <SelectTrigger className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent>
              </Select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label><Textarea value={ticketData.description} onChange={(e) => setTicketData({...ticketData, description: e.target.value})} required rows={4} className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" /></div>
            <Button type="submit" className="w-full bg-gradient-to-r from-[#FF3D33] to-[#215F9A] hover:from-[#e63529] hover:to-[#1a4d7a] text-white border-0">Create Ticket</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
