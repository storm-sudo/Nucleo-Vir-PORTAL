import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Calendar() {
  const { user } = useOutletContext();
  const [events, setEvents] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', start_time: '', end_time: '' });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/calendar/events`, { credentials: 'include' });
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/calendar/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        toast.success('Event created');
        setDialogOpen(false);
        setFormData({ title: '', description: '', start_time: '', end_time: '' });
        fetchEvents();
      } else {
        toast.error('Failed to create event');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const isAdmin = user?.role === 'Admin';

  return (
    <div data-testid="calendar-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Calendar</h1>
          <p className="text-slate-600">Schedule and manage meetings & events</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-event-btn" className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Calendar Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <Input
                    data-testid="event-title-input"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <Textarea
                    data-testid="event-description-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                  <Input
                    data-testid="event-start-time-input"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                  <Input
                    data-testid="event-end-time-input"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    required
                  />
                </div>
                <Button type="submit" data-testid="event-submit-btn" className="w-full bg-slate-900 hover:bg-slate-800">
                  Create Event
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <Card key={event.event_id} data-testid="calendar-event-card" className="border-slate-200">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <h3 className="text-lg font-heading font-semibold text-slate-900">{event.title}</h3>
                <p className="text-slate-600">{event.description}</p>
                <div className="text-sm text-slate-600">
                  <strong>Time:</strong> {new Date(event.start_time).toLocaleString()} - {new Date(event.end_time).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {events.length === 0 && (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <CalendarIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No events scheduled</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}