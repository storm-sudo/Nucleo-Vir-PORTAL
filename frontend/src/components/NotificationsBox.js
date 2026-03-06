import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Bell, Plus, AlertCircle, Megaphone, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import { BACKEND_URL } from '@/config';

export default function NotificationsBox({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', message: '', type: 'General' });

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications`, { credentials: 'include' });
      setNotifications(await response.json());
    } catch (error) { console.error('Error:', error); }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/announcements`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(formData)
      });
      if (response.ok) { toast.success('Announcement created'); setDialogOpen(false); setFormData({ title: '', message: '', type: 'General' }); fetchNotifications(); }
      else toast.error('Failed to create announcement');
    } catch (error) { toast.error('An error occurred'); }
  };

  const getNotificationIcon = (type, announcementType) => {
    if (type === 'announcement') {
      if (announcementType === 'Urgent') return <AlertCircle className="h-5 w-5 text-red-500" />;
      if (announcementType === 'Meeting') return <Megaphone className="h-5 w-5 text-blue-500" />;
      return <Bell className="h-5 w-5 text-gray-500 dark:text-slate-400" />;
    }
    if (type === 'alert') return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <Bell className="h-5 w-5 text-blue-500" />;
  };

  const getNotificationBg = (type, announcementType) => {
    if (type === 'announcement' && announcementType === 'Urgent') return 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30';
    if (type === 'alert') return 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30';
    return 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600';
  };

  const isAdmin = user && ['Admin', 'SuperAdmin'].includes(user.role);

  return (
    <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-heading flex items-center text-gray-900 dark:text-white">
            <Bell className="h-5 w-5 mr-2 text-[#FF3D33]" />Notifications
            {notifications.length > 0 && <Badge className="ml-2 bg-[#FF3D33] text-white">{notifications.length}</Badge>}
          </CardTitle>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-to-r from-[#FF3D33] to-[#215F9A] text-white border-0"><Plus className="h-4 w-4 mr-2" />New Announcement</Button>
              </DialogTrigger>
              <DialogContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                <DialogHeader><DialogTitle className="text-gray-900 dark:text-white">Create Announcement</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Title</label><Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Message</label><Textarea value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} required rows={4} className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" /></div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Type</label>
                    <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                      <SelectTrigger className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"><SelectItem value="General">General</SelectItem><SelectItem value="Meeting">Meeting</SelectItem><SelectItem value="Urgent">Urgent</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-[#FF3D33] to-[#215F9A] text-white border-0">Create Announcement</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-auto space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
            <Bell className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-2" /><p>No notifications</p>
          </div>
        ) : (
          notifications.map((notification, idx) => (
            <div key={idx} className={`p-3 rounded-lg border ${getNotificationBg(notification.type, notification.announcement_type)}`}>
              <div className="flex items-start space-x-3">
                {getNotificationIcon(notification.type, notification.announcement_type)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white text-sm">{notification.title}</div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{notification.message}</p>
                  {notification.created_at && <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{new Date(notification.created_at).toLocaleDateString()} at {new Date(notification.created_at).toLocaleTimeString()}</p>}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
