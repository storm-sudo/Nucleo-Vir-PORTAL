import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Bell, X, Plus, AlertCircle, Megaphone, AlertTriangle } from 'lucide-react';
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
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        toast.success('Announcement created successfully');
        setDialogOpen(false);
        setFormData({ title: '', message: '', type: 'General' });
        fetchNotifications();
      } else {
        toast.error('Failed to create announcement');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const getNotificationIcon = (type, announcementType) => {
    if (type === 'announcement') {
      if (announcementType === 'Urgent') return <AlertCircle className="h-5 w-5 text-rose-400" />;
      if (announcementType === 'Meeting') return <Megaphone className="h-5 w-5 text-[#215F9A]" />;
      return <Bell className="h-5 w-5 text-slate-400" />;
    }
    if (type === 'alert') return <AlertTriangle className="h-5 w-5 text-amber-400" />;
    return <Bell className="h-5 w-5 text-[#215F9A]" />;
  };

  const getNotificationBg = (type, announcementType) => {
    if (type === 'announcement' && announcementType === 'Urgent') return 'bg-rose-500/10 border-rose-500/30';
    if (type === 'alert') return 'bg-amber-500/10 border-amber-500/30';
    return 'bg-slate-700/30 border-slate-600/50';
  };

  const isAdmin = user && user.role === 'Admin';

  return (
    <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-heading flex items-center text-white">
            <Bell className="h-5 w-5 mr-2 text-[#FF3D33]" />
            Notifications
            {notifications.length > 0 && (
              <Badge className="ml-2 bg-[#FF3D33] text-white">{notifications.length}</Badge>
            )}
          </CardTitle>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="create-announcement-btn" className="bg-gradient-to-r from-[#FF3D33] to-[#215F9A] text-white border-0">
                  <Plus className="h-4 w-4 mr-2" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Create Announcement</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                    <Input
                      data-testid="announcement-title-input"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      required
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Message</label>
                    <Textarea
                      data-testid="announcement-message-textarea"
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      required
                      rows={4}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
                    <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                      <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="Meeting">Meeting</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" data-testid="announcement-submit-btn" className="w-full bg-gradient-to-r from-[#FF3D33] to-[#215F9A] text-white border-0">
                    Create Announcement
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-auto space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Bell className="h-12 w-12 text-slate-600 mx-auto mb-2" />
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map((notification, idx) => (
            <div
              key={idx}
              data-testid="notification-item"
              className={`p-3 rounded-lg border ${getNotificationBg(notification.type, notification.announcement_type)}`}
            >
              <div className="flex items-start space-x-3">
                {getNotificationIcon(notification.type, notification.announcement_type)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white text-sm">{notification.title}</div>
                  <p className="text-sm text-slate-400 mt-1">{notification.message}</p>
                  {notification.created_at && (
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(notification.created_at).toLocaleDateString()} at {new Date(notification.created_at).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
