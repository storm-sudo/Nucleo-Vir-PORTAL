import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function EquipmentSchedule() {
  const [bookings, setBookings] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ equipment_name: '', start_time: '', end_time: '', purpose: '' });

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/equipment-bookings`, { credentials: 'include' });
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/equipment-bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        toast.success('Equipment booked');
        setDialogOpen(false);
        setFormData({ equipment_name: '', start_time: '', end_time: '', purpose: '' });
        fetchBookings();
      } else {
        toast.error('Failed to book equipment');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  return (
    <div data-testid="equipment-schedule-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Equipment Schedule</h1>
          <p className="text-slate-600">Book and manage lab equipment</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="book-equipment-btn" className="bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-2" />
              Book Equipment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Book Equipment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Equipment Name</label>
                <Input
                  data-testid="equipment-name-input"
                  value={formData.equipment_name}
                  onChange={(e) => setFormData({...formData, equipment_name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                <Input
                  data-testid="booking-start-time-input"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                <Input
                  data-testid="booking-end-time-input"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purpose</label>
                <Textarea
                  data-testid="booking-purpose-textarea"
                  value={formData.purpose}
                  onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                  required
                  rows={3}
                />
              </div>
              <Button type="submit" data-testid="booking-submit-btn" className="w-full bg-slate-900 hover:bg-slate-800">
                Book Equipment
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {bookings.map((booking) => (
          <Card key={booking.booking_id} data-testid="equipment-booking-card" className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="text-lg font-heading font-semibold text-slate-900">{booking.equipment_name}</div>
                  <div className="text-sm text-slate-600">
                    <strong>Time:</strong> {new Date(booking.start_time).toLocaleString()} - {new Date(booking.end_time).toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-600">
                    <strong>Purpose:</strong> {booking.purpose}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bookings.length === 0 && (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <CalendarIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No equipment bookings found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}