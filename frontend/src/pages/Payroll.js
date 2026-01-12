import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { DollarSign, Plus } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Payroll() {
  const { user } = useOutletContext();
  const [payroll, setPayroll] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    month: '',
    basic_salary: '',
    deductions: '0',
    bonuses: '0'
  });

  useEffect(() => {
    fetchPayroll();
    if (user && ['Admin', 'HR', 'Accountant'].includes(user.role)) {
      fetchEmployees();
    }
  }, [user]);

  const fetchPayroll = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/payroll`, { credentials: 'include' });
      const data = await response.json();
      setPayroll(data);
    } catch (error) {
      console.error('Error fetching payroll:', error);
    }
  };

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
      const response = await fetch(`${BACKEND_URL}/api/payroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          basic_salary: parseFloat(formData.basic_salary),
          deductions: parseFloat(formData.deductions),
          bonuses: parseFloat(formData.bonuses)
        })
      });
      
      if (response.ok) {
        toast.success('Payroll record created successfully');
        setDialogOpen(false);
        setFormData({
          employee_id: '',
          month: '',
          basic_salary: '',
          deductions: '0',
          bonuses: '0'
        });
        fetchPayroll();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to create payroll record');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const calculateNetSalary = () => {
    const basic = parseFloat(formData.basic_salary) || 0;
    const deductions = parseFloat(formData.deductions) || 0;
    const bonuses = parseFloat(formData.bonuses) || 0;
    return basic - deductions + bonuses;
  };

  const canManage = user && ['Admin', 'HR', 'Accountant'].includes(user.role);

  return (
    <div data-testid="payroll-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Payroll</h1>
          <p className="text-slate-600">View salary and payslip records</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-payroll-btn" className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Create Payroll
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Payroll Record</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
                  <Select value={formData.employee_id} onValueChange={(val) => setFormData({...formData, employee_id: val})}>
                    <SelectTrigger data-testid="payroll-employee-select">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.employee_id} value={emp.employee_id}>
                          {emp.name} - {emp.employee_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Month (YYYY-MM)</label>
                  <Input
                    data-testid="payroll-month-input"
                    type="month"
                    value={formData.month}
                    onChange={(e) => setFormData({...formData, month: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Basic Salary (₹)</label>
                  <Input
                    data-testid="payroll-basic-salary-input"
                    type="number"
                    step="0.01"
                    value={formData.basic_salary}
                    onChange={(e) => setFormData({...formData, basic_salary: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deductions (₹)</label>
                  <Input
                    data-testid="payroll-deductions-input"
                    type="number"
                    step="0.01"
                    value={formData.deductions}
                    onChange={(e) => setFormData({...formData, deductions: e.target.value})}
                  />
                  <p className="text-xs text-slate-500 mt-1">Taxes, insurance, etc.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bonuses (₹)</label>
                  <Input
                    data-testid="payroll-bonuses-input"
                    type="number"
                    step="0.01"
                    value={formData.bonuses}
                    onChange={(e) => setFormData({...formData, bonuses: e.target.value})}
                  />
                  <p className="text-xs text-slate-500 mt-1">Performance bonus, incentives, etc.</p>
                </div>
                {(formData.basic_salary || formData.deductions || formData.bonuses) && (
                  <div className="bg-sky-50 p-4 rounded-lg border border-sky-200">
                    <div className="text-sm text-slate-600 mb-1">Net Salary (calculated):</div>
                    <div className="text-2xl font-heading font-bold text-slate-900">
                      ₹{calculateNetSalary().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
                <Button type="submit" data-testid="payroll-submit-btn" className="w-full bg-slate-900 hover:bg-slate-800">
                  Create Payroll Record
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {payroll.map((record) => (
          <Card key={record.payroll_id} className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-slate-900">Month: {record.month}</div>
                  <div className="text-sm text-slate-600 mt-1">
                    Employee ID: {record.employee_id}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    Basic: ₹{record.basic_salary.toLocaleString('en-IN')} | 
                    Deductions: ₹{record.deductions.toLocaleString('en-IN')} | 
                    Bonuses: ₹{record.bonuses.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-heading font-bold text-slate-900">
                    ₹{record.net_salary.toLocaleString('en-IN')}
                  </div>
                  <div className="text-sm text-slate-500">Net Salary</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {payroll.length === 0 && (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No payroll records found</p>
            {canManage && (
              <p className="text-slate-500 text-sm mt-2">Create your first payroll record to get started</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
