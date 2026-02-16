import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, ClipboardList } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

import { BACKEND_URL } from '@/config';

export default function Helpdesk() {
  const { user } = useOutletContext();
  const [tickets, setTickets] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ subject: '', description: '', category: 'Technical', priority: 'Medium' });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/helpdesk/tickets`, { credentials: 'include' });
      const data = await response.json();
      setTickets(data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/helpdesk/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        toast.success('Ticket created');
        setDialogOpen(false);
        setFormData({ subject: '', description: '', category: 'Technical', priority: 'Medium' });
        fetchTickets();
      } else {
        toast.error('Failed to create ticket');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleUpdateStatus = async (ticketId, status) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/helpdesk/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        toast.success('Ticket updated');
        fetchTickets();
      } else {
        toast.error('Failed to update ticket');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const canManage = user && ['Admin', 'HR'].includes(user.role);

  return (
    <div data-testid="helpdesk-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Helpdesk</h1>
          <p className="text-slate-600">Submit and track support tickets</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-ticket-btn" className="bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <Input
                  data-testid="ticket-subject-input"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <Textarea
                  data-testid="ticket-description-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                  <SelectTrigger data-testid="ticket-category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                <Select value={formData.priority} onValueChange={(val) => setFormData({...formData, priority: val})}>
                  <SelectTrigger data-testid="ticket-priority-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" data-testid="ticket-submit-btn" className="w-full bg-slate-900 hover:bg-slate-800">
                Create Ticket
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {tickets.map((ticket) => (
          <Card key={ticket.ticket_id} data-testid="helpdesk-ticket-card" className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-heading font-semibold text-slate-900">{ticket.subject}</h3>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      ticket.priority === 'High' ? 'bg-rose-50 text-rose-600' :
                      ticket.priority === 'Medium' ? 'bg-amber-50 text-amber-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {ticket.priority}
                    </span>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      ticket.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600' :
                      ticket.status === 'In Progress' ? 'bg-sky-50 text-sky-600' :
                      ticket.status === 'Closed' ? 'bg-slate-100 text-slate-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-slate-600">{ticket.description}</p>
                  <div className="text-sm text-slate-500">
                    Category: {ticket.category} | ID: {ticket.ticket_id}
                  </div>
                </div>
                {canManage && ticket.status !== 'Closed' && (
                  <div className="ml-4">
                    <Select
                      value={ticket.status}
                      onValueChange={(val) => handleUpdateStatus(ticket.ticket_id, val)}
                    >
                      <SelectTrigger className="w-32" data-testid="ticket-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Resolved">Resolved</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tickets.length === 0 && (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No tickets found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}