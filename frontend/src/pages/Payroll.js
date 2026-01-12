import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Payroll() {
  const [payroll, setPayroll] = useState([]);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/payroll`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setPayroll(data))
      .catch(console.error);
  }, []);

  return (
    <div data-testid="payroll-page" className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900">Payroll</h1>
        <p className="text-slate-600">View salary and payslip records</p>
      </div>

      <div className="space-y-4">
        {payroll.map((record) => (
          <Card key={record.payroll_id} className="border-slate-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-slate-900">Month: {record.month}</div>
                  <div className="text-sm text-slate-600 mt-1">
                    Basic: ₹{record.basic_salary} | Deductions: ₹{record.deductions} | Bonuses: ₹{record.bonuses}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-heading font-bold text-slate-900">₹{record.net_salary}</div>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}