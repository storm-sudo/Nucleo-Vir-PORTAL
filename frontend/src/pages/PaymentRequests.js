import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, DollarSign } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

import { BACKEND_URL } from '@/config';

export default function PaymentRequests() {
  const { user } = useOutletContext();
  const [requests, setRequests] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ amount: '', description: '' });

  useEffect(() => {
    if (user && ['Admin', 'Accountant', 'CA', 'SuperAdmin'].includes(user.role)) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payment-requests`, { credentials: 'include' });
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching payment requests:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/payment-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        toast.success('Payment request submitted');
        setDialogOpen(false);
        setFormData({ amount: '', description: '' });
        fetchRequests();
      } else {
        toast.error('Failed to submit request');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleApproval = async (paymentId, status) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payment-requests/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        toast.success(`Payment request ${status.toLowerCase()}`);
        fetchRequests();
      } else {
        toast.error('Failed to update request');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const canCreate = ['CA', 'SuperAdmin'].includes(user?.role);
  const canApprove = user && ['Admin', 'Accountant', 'SuperAdmin'].includes(user.role);

  return (
    <div data-testid="payment-requests-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Payment Requests</h1>
          <p className="text-slate-600">Manage payment requests and approvals</p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-payment-request-btn" className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Payment Request</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <Input
                    data-testid="payment-amount-input"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <Textarea
                    data-testid="payment-description-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
                    rows={3}
                  />
                </div>
                <Button type="submit" data-testid="payment-submit-btn" className="w-full bg-slate-900 hover:bg-slate-800">
                  Submit Request
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.payment_id} className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-heading font-bold text-slate-900">₹{request.amount}</span>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      request.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                      request.status === 'Rejected' ? 'bg-rose-50 text-rose-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    <strong>From:</strong> {request.ca_name}
                  </div>
                  <div className="text-sm text-slate-600">
                    <strong>Description:</strong> {request.description}
                  </div>
                  <div className="text-xs text-slate-500">
                    ID: {request.payment_id}
                  </div>
                </div>
                {canApprove && request.status === 'Pending' && (
                  <div className="flex space-x-2 ml-4">
                    <Button
                      size="sm"
                      data-testid="approve-payment-btn"
                      onClick={() => handleApproval(request.payment_id, 'Approved')}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid="reject-payment-btn"
                      onClick={() => handleApproval(request.payment_id, 'Rejected')}
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
            <DollarSign className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No payment requests found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}