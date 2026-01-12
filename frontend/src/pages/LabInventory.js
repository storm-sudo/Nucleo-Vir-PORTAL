import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Package } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function LabInventory() {
  const { user } = useOutletContext();
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: 'Equipment', quantity: '', unit: '', location: '' });
  const [requestData, setRequestData] = useState({ item_id: '', quantity: '', reason: '' });

  useEffect(() => {
    fetchItems();
    fetchRequests();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/inventory`, { credentials: 'include' });
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/inventory-requests`, { credentials: 'include' });
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        toast.success('Item added');
        setDialogOpen(false);
        setFormData({ name: '', category: 'Equipment', quantity: '', unit: '', location: '' });
        fetchItems();
      } else {
        toast.error('Failed to add item');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/inventory-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        toast.success('Request submitted');
        setRequestDialogOpen(false);
        setRequestData({ item_id: '', quantity: '', reason: '' });
        fetchRequests();
      } else {
        toast.error('Failed to submit request');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleApproval = async (requestId, status) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/inventory-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        toast.success(`Request ${status.toLowerCase()}`);
        fetchRequests();
      } else {
        toast.error('Failed to update request');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const canManage = user && ['Admin', 'HR'].includes(user.role);

  return (
    <div data-testid="lab-inventory-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Lab Inventory</h1>
          <p className="text-slate-600">Manage equipment and reagents</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="request-item-btn" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Request Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Inventory Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Item</label>
                  <Select value={requestData.item_id} onValueChange={(val) => setRequestData({...requestData, item_id: val})}>
                    <SelectTrigger data-testid="request-item-select">
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.item_id} value={item.item_id}>
                          {item.name} ({item.quantity} {item.unit} available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <Input
                    data-testid="request-quantity-input"
                    type="number"
                    value={requestData.quantity}
                    onChange={(e) => setRequestData({...requestData, quantity: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                  <Textarea
                    data-testid="request-reason-textarea"
                    value={requestData.reason}
                    onChange={(e) => setRequestData({...requestData, reason: e.target.value})}
                    required
                    rows={3}
                  />
                </div>
                <Button type="submit" data-testid="request-submit-btn" className="w-full bg-slate-900 hover:bg-slate-800">
                  Submit Request
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-item-btn" className="bg-slate-900 hover:bg-slate-800">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Inventory Item</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                    <Input
                      data-testid="item-name-input"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                      <SelectTrigger data-testid="item-category-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Reagent">Reagent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                      <Input
                        data-testid="item-quantity-input"
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                      <Input
                        data-testid="item-unit-input"
                        value={formData.unit}
                        onChange={(e) => setFormData({...formData, unit: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                    <Input
                      data-testid="item-location-input"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      required
                    />
                  </div>
                  <Button type="submit" data-testid="item-submit-btn" className="w-full bg-slate-900 hover:bg-slate-800">
                    Add Item
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Inventory Items */}
      <div>
        <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">Inventory Items</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.item_id} data-testid="inventory-item-card" className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base font-heading">{item.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-slate-600">
                  <strong>Category:</strong> {item.category}
                </div>
                <div className="text-sm text-slate-600">
                  <strong>Quantity:</strong> {item.quantity} {item.unit}
                </div>
                <div className="text-sm text-slate-600">
                  <strong>Location:</strong> {item.location}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Requests */}
      <div>
        <h2 className="text-xl font-heading font-bold text-slate-900 mb-4">Inventory Requests</h2>
        <div className="space-y-3">
          {requests.map((request) => (
            <Card key={request.request_id} className="border-slate-200">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 flex-1">
                    <div className="text-sm text-slate-600">
                      <strong>Item ID:</strong> {request.item_id}
                    </div>
                    <div className="text-sm text-slate-600">
                      <strong>Quantity:</strong> {request.quantity}
                    </div>
                    <div className="text-sm text-slate-600">
                      <strong>Reason:</strong> {request.reason}
                    </div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      request.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                      request.status === 'Rejected' ? 'bg-rose-50 text-rose-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  {canManage && request.status === 'Pending' && (
                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        data-testid="approve-inventory-request-btn"
                        onClick={() => handleApproval(request.request_id, 'Approved')}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid="reject-inventory-request-btn"
                        onClick={() => handleApproval(request.request_id, 'Rejected')}
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
      </div>

      {items.length === 0 && requests.length === 0 && (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No inventory items or requests found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}