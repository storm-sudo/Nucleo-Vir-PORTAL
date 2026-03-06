import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

import { BACKEND_URL } from '@/config';

export default function LeaveRequests() {
  const { user } = useOutletContext();
  const [requests, setRequests] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: 'Casual', start_date: '', end_date: '', reason: ''
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/leave-requests`, { credentials: 'include' });
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/leave-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        toast.success('Leave request submitted');
        setDialogOpen(false);
        setFormData({ leave_type: 'Casual', start_date: '', end_date: '', reason: '' });
        fetchRequests();
      } else {
        toast.error('Failed to submit request');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleApproval = async (leaveId, status) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/leave-requests/${leaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        toast.success(`Leave request ${status.toLowerCase()}`);
        fetchRequests();
      } else {
        toast.error('Failed to update request');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const canApprove = user && ['Admin', 'HR', 'SuperAdmin'].includes(user.role);

  return (
    <div data-testid="leave-requests-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Leave Requests</h1>
          <p className="text-slate-600">Submit and manage leave requests</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="request-leave-btn" className="bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-2" />
              Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Leave Request</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
                <Select value={formData.leave_type} onValueChange={(val) => setFormData({...formData, leave_type: val})}>
                  <SelectTrigger data-testid="leave-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Casual">Casual Leave</SelectItem>
                    <SelectItem value="Sick">Sick Leave</SelectItem>
                    <SelectItem value="Vacation">Vacation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <Input
                  data-testid="leave-start-date-input"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                <Input
                  data-testid="leave-end-date-input"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <Textarea
                  data-testid="leave-reason-textarea"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  required
                  rows={3}
                />
              </div>
              <Button type="submit" data-testid="leave-submit-btn" className="w-full bg-slate-900 hover:bg-slate-800">
                Submit Request
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.leave_id} data-testid="leave-request-card" className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-sky-50 text-sky-600 rounded">
                      {request.leave_type}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      request.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                      request.status === 'Rejected' ? 'bg-rose-50 text-rose-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {request.status === 'Approved' && <CheckCircle className="h-4 w-4 mr-1" />}
                      {request.status === 'Rejected' && <XCircle className="h-4 w-4 mr-1" />}
                      {request.status === 'Pending' && <Clock className="h-4 w-4 mr-1" />}
                      {request.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    <strong>Duration:</strong> {request.start_date} to {request.end_date}
                  </div>
                  <div className="text-sm text-slate-600">
                    <strong>Reason:</strong> {request.reason}
                  </div>
                </div>
                {canApprove && request.status === 'Pending' && (
                  <div className="flex space-x-2 ml-4">
                    <Button
                      size="sm"
                      data-testid="approve-leave-btn"
                      onClick={() => handleApproval(request.leave_id, 'Approved')}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid="reject-leave-btn"
                      onClick={() => handleApproval(request.leave_id, 'Rejected')}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {requests.length === 0 && (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No leave requests found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { FileText } from 'lucide-react';