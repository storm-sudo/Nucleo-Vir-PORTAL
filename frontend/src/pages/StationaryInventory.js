import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, AlertTriangle, Package } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import ConfirmDialog from '@/components/ConfirmDialog';

import { BACKEND_URL } from '@/config';

export default function StationaryInventory() {
  const { user } = useOutletContext();
  const [items, setItems] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '', category: 'Pens', quantity: '', unit: 'pieces', min_stock_level: '10', location: ''
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/stationary`, { credentials: 'include' });
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Error fetching stationary items:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/stationary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          min_stock_level: parseInt(formData.min_stock_level)
        })
      });
      
      if (response.ok) {
        toast.success('Item added successfully');
        setDialogOpen(false);
        setFormData({ name: '', category: 'Pens', quantity: '', unit: 'pieces', min_stock_level: '10', location: '' });
        fetchItems();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to add item');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity.toString(),
      unit: item.unit,
      min_stock_level: item.min_stock_level.toString(),
      location: item.location || ''
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/stationary/${selectedItem.item_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          min_stock_level: parseInt(formData.min_stock_level)
        })
      });
      
      if (response.ok) {
        toast.success('Item updated successfully');
        setEditDialogOpen(false);
        setSelectedItem(null);
        fetchItems();
      } else {
        toast.error('Failed to update item');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleDeleteClick = (item) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/stationary/${selectedItem.item_id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        toast.success('Item deleted successfully');
        setDeleteDialogOpen(false);
        setSelectedItem(null);
        fetchItems();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to delete item');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const isAdmin = user && user.role === 'Admin';
  const lowStockItems = items.filter(item => item.quantity <= item.min_stock_level);

  return (
    <div data-testid="stationary-inventory-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Stationary Inventory</h1>
          <p className="text-slate-600">Manage office supplies and lab stationery</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-stationary-btn" className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Stationary Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <Input
                    data-testid="stationary-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                    <SelectTrigger data-testid="stationary-category-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pens">Pens</SelectItem>
                      <SelectItem value="Notebooks">Notebooks</SelectItem>
                      <SelectItem value="Lab Stationery">Lab Stationery</SelectItem>
                      <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                    <Input
                      data-testid="stationary-quantity-input"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                    <Input
                      data-testid="stationary-unit-input"
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Min Stock Level</label>
                  <Input
                    data-testid="stationary-min-stock-input"
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({...formData, min_stock_level: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <Input
                    data-testid="stationary-location-input"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>
                <Button type="submit" data-testid="stationary-submit-btn" className="w-full bg-slate-900 hover:bg-slate-800">
                  Add Item
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stationary Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pens">Pens</SelectItem>
                  <SelectItem value="Notebooks">Notebooks</SelectItem>
                  <SelectItem value="Lab Stationery">Lab Stationery</SelectItem>
                  <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Stock Level</label>
              <Input
                type="number"
                value={formData.min_stock_level}
                onChange={(e) => setFormData({...formData, min_stock_level: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              />
            </div>
            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800">
              Update Item
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Stationary Item"
        description={`Are you sure you want to delete ${selectedItem?.name}? This action cannot be undone.`}
      />

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-lg font-heading text-amber-900">Low Stock Alert</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-amber-800 mb-2">The following items are running low:</p>
            <ul className="list-disc list-inside text-amber-700 space-y-1">
              {lowStockItems.map(item => (
                <li key={item.item_id}>
                  <strong>{item.name}</strong>: {item.quantity} {item.unit} (min: {item.min_stock_level})
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Items Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const isLowStock = item.quantity <= item.min_stock_level;
          return (
            <Card key={item.item_id} data-testid="stationary-item-card" className={`border-slate-200 hover:shadow-lg transition-shadow duration-300 ${isLowStock ? 'border-l-4 border-l-amber-500' : ''}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-heading">{item.name}</CardTitle>
                  {isAdmin && (
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid="edit-stationary-btn"
                        onClick={() => handleEdit(item)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4 text-sky-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid="delete-stationary-btn"
                        onClick={() => handleDeleteClick(item)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-slate-600">
                  <strong>Category:</strong> {item.category}
                </div>
                <div className="flex justify-between items-center">
                  <div className={`text-lg font-heading font-bold ${isLowStock ? 'text-amber-600' : 'text-slate-900'}`}>
                    {item.quantity} {item.unit}
                  </div>
                  {isLowStock && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Low Stock
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  Min level: {item.min_stock_level} {item.unit}
                </div>
                {item.location && (
                  <div className="text-sm text-slate-600">
                    <strong>Location:</strong> {item.location}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {items.length === 0 && (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No stationary items found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}