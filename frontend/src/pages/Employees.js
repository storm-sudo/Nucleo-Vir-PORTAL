import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Mail, Phone, Building2, Pencil, Trash2 } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import ConfirmDialog from '@/components/ConfirmDialog';

import { BACKEND_URL } from '@/config';

export default function Employees() {
  const { user } = useOutletContext();
  const [employees, setEmployees] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', role: 'Employee', department: '', phone: '', salary: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/employees`, { credentials: 'include' });
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        toast.success('Employee added successfully');
        setDialogOpen(false);
        setFormData({ name: '', email: '', role: 'Employee', department: '', phone: '', salary: '' });
        fetchEmployees();
      } else {
        toast.error('Failed to add employee');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      phone: employee.phone || '',
      salary: employee.salary || ''
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/employees/${selectedEmployee.employee_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        toast.success('Employee updated successfully');
        setEditDialogOpen(false);
        setSelectedEmployee(null);
        fetchEmployees();
      } else {
        toast.error('Failed to update employee');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleDeleteClick = (employee) => {
    setSelectedEmployee(employee);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/employees/${selectedEmployee.employee_id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        toast.success('Employee deleted successfully');
        setDeleteDialogOpen(false);
        setSelectedEmployee(null);
        fetchEmployees();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to delete employee');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const canManage = user && ['Admin', 'HR', 'SuperAdmin'].includes(user.role);
  const canDelete = user && ['Admin', 'SuperAdmin'].includes(user.role);

  return (
    <div data-testid="employees-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Employees</h1>
          <p className="text-slate-600">Manage employee records and onboarding</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-employee-btn" className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <Input
                    data-testid="employee-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <Input
                    data-testid="employee-email-input"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                    <SelectTrigger data-testid="employee-role-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="Employee">Employee</SelectItem>
                      <SelectItem value="Intern">Intern</SelectItem>
                      <SelectItem value="Accountant">Accountant</SelectItem>
                      <SelectItem value="CA">CA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <Input
                    data-testid="employee-department-input"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <Input
                    data-testid="employee-phone-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Salary</label>
                  <Input
                    data-testid="employee-salary-input"
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({...formData, salary: e.target.value})}
                  />
                </div>
                <Button type="submit" data-testid="employee-submit-btn" className="w-full bg-slate-900 hover:bg-slate-800">
                  Add Employee
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
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <Input
                data-testid="edit-employee-name-input"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <Input
                data-testid="edit-employee-email-input"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <Select value={formData.role} onValueChange={(val) => setFormData({...formData, role: val})}>
                <SelectTrigger data-testid="edit-employee-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="Employee">Employee</SelectItem>
                  <SelectItem value="Intern">Intern</SelectItem>
                  <SelectItem value="Accountant">Accountant</SelectItem>
                  <SelectItem value="CA">CA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <Input
                data-testid="edit-employee-department-input"
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <Input
                data-testid="edit-employee-phone-input"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Salary</label>
              <Input
                data-testid="edit-employee-salary-input"
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({...formData, salary: e.target.value})}
              />
            </div>
            <Button type="submit" data-testid="employee-update-btn" className="w-full bg-slate-900 hover:bg-slate-800">
              Update Employee
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Employee"
        description={`Are you sure you want to delete ${selectedEmployee?.name}? This action cannot be undone.`}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((employee) => (
          <Card key={employee.employee_id} data-testid="employee-card" className="border-slate-200 hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-heading">{employee.name}</CardTitle>
                {canManage && (
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      data-testid="edit-employee-btn"
                      onClick={() => handleEdit(employee)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-4 w-4 text-sky-600" />
                    </Button>
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid="delete-employee-btn"
                        onClick={() => handleDeleteClick(employee)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center text-sm text-slate-600">
                <Mail className="h-4 w-4 mr-2 text-sky-500" />
                {employee.email}
              </div>
              <div className="flex items-center text-sm text-slate-600">
                <Building2 className="h-4 w-4 mr-2 text-sky-500" />
                {employee.department}
              </div>
              {employee.phone && (
                <div className="flex items-center text-sm text-slate-600">
                  <Phone className="h-4 w-4 mr-2 text-sky-500" />
                  {employee.phone}
                </div>
              )}
              <div className="pt-2 border-t border-slate-200">
                <span className="inline-block px-2 py-1 text-xs font-medium bg-sky-50 text-sky-600 rounded">
                  {employee.role}
                </span>
                <span className="inline-block ml-2 px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded">
                  {employee.employee_id}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {employees.length === 0 && (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No employees found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
