import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Attendance() {
  const { user } = useOutletContext();
  const [attendance, setAttendance] = useState([]);
  const [todayMarked, setTodayMarked] = useState(false);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/attendance/heatmap`, { credentials: 'include' });
      const data = await response.json();
      setAttendance(data);
      
      const today = new Date().toISOString().split('T')[0];
      const marked = data.some(record => record.date === today);
      setTodayMarked(marked);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const handleMarkAttendance = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'Present' })
      });
      
      if (response.ok) {
        toast.success('Attendance marked successfully');
        fetchAttendance();
      } else {
        toast.error('Failed to mark attendance');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleExportAttendance = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/attendance/export`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success('Attendance data exported successfully');
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to export attendance');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const isAdmin = user && user.role === 'Admin';

  return (
    <div data-testid="attendance-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Attendance</h1>
          <p className="text-slate-600">Track your attendance and view history</p>
        </div>
        {isAdmin && (
          <Button onClick={handleExportAttendance} data-testid="export-attendance-btn" className="bg-emerald-600 hover:bg-emerald-700">
            <Download className="h-4 w-4 mr-2" />
            Download Attendance CSV
          </Button>
        )}
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-heading">Today's Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {!todayMarked ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">You haven't marked your attendance today</p>
              <Button onClick={handleMarkAttendance} data-testid="mark-attendance-btn" className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Present
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <p className="text-slate-600">Attendance marked for today</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-heading">Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length > 0 ? (
            <div className="space-y-2">
              {attendance.slice(0, 10).map((record) => (
                <div key={record.attendance_id} className="flex justify-between items-center p-3 border border-slate-200 rounded-lg">
                  <div>
                    <div className="font-medium text-slate-900">{record.date}</div>
                    <div className="text-sm text-slate-500">
                      {record.check_in && `Check-in: ${new Date(record.check_in).toLocaleTimeString()}`}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    record.status === 'Present' ? 'bg-emerald-50 text-emerald-600' :
                    record.status === 'Absent' ? 'bg-rose-50 text-rose-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {record.status === 'Present' && <CheckCircle className="h-4 w-4 mr-1" />}
                    {record.status === 'Absent' && <XCircle className="h-4 w-4 mr-1" />}
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-600 py-8">No attendance records found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}