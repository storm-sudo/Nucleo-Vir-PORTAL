import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Download, Search, TrendingUp } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Attendance() {
  const { user } = useOutletContext();
  const [attendance, setAttendance] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [todayMarked, setTodayMarked] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [searchMonth, setSearchMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchAttendance();
    if (user && user.role === 'Admin') {
      fetchEmployees();
    }
  }, [user]);

  useEffect(() => {
    if (searchMonth || selectedEmployeeId) {
      fetchStatistics();
    }
  }, [searchMonth, selectedEmployeeId]);

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

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/employees`, { credentials: 'include' });
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedEmployeeId && selectedEmployeeId !== 'self' && user.role === 'Admin') {
        params.append('user_id', selectedEmployeeId);
      }
      if (searchMonth) {
        params.append('month', searchMonth);
      }

      const response = await fetch(`${BACKEND_URL}/api/attendance/statistics?${params}`, { credentials: 'include' });
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleSearch = async () => {
    if (!startDate && !endDate && !searchMonth) {
      fetchAttendance();
      return;
    }

    try {
      const params = new URLSearchParams();
      if (selectedEmployeeId && user.role === 'Admin') {
        params.append('user_id', selectedEmployeeId);
      }
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`${BACKEND_URL}/api/attendance/search?${params}`, { credentials: 'include' });
      const data = await response.json();
      setAttendance(data);
    } catch (error) {
      console.error('Error searching attendance:', error);
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
        fetchStatistics();
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

      {/* Search and Filter Section */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center">
            <Search className="h-5 w-5 mr-2 text-sky-500" />
            Search Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employee (Admin View)</label>
                <Select value={selectedEmployeeId} onValueChange={(val) => setSelectedEmployeeId(val)}>
                  <SelectTrigger data-testid="employee-select">
                    <SelectValue placeholder="All employees / My attendance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">My Attendance</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.employee_id} value={emp.user_id || emp.employee_id}>
                        {emp.name} - {emp.employee_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
              <Input
                type="month"
                data-testid="month-filter"
                value={searchMonth}
                onChange={(e) => setSearchMonth(e.target.value)}
                placeholder="YYYY-MM"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <Input
                type="date"
                data-testid="start-date-filter"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <Input
                type="date"
                data-testid="end-date-filter"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleSearch} data-testid="search-btn" className="bg-sky-600 hover:bg-sky-700">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button
              onClick={() => {
                setSearchMonth('');
                setStartDate('');
                setEndDate('');
                setSelectedEmployeeId('');
                fetchAttendance();
                setStatistics(null);
              }}
              variant="outline"
              data-testid="clear-filters-btn"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Card */}
      {statistics && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-sky-500" />
              Attendance Statistics {searchMonth && `- ${searchMonth}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="text-sm text-slate-600 mb-1">Total Days</div>
                <div className="text-2xl font-heading font-bold text-slate-900">{statistics.total_days}</div>
              </div>
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                <div className="text-sm text-emerald-700 mb-1">Present Days</div>
                <div className="text-2xl font-heading font-bold text-emerald-600">{statistics.present_days}</div>
              </div>
              <div className="bg-rose-50 p-4 rounded-lg border border-rose-200">
                <div className="text-sm text-rose-700 mb-1">Absent Days</div>
                <div className="text-2xl font-heading font-bold text-rose-600">{statistics.absent_days}</div>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <div className="text-sm text-amber-700 mb-1">Leave Days</div>
                <div className="text-2xl font-heading font-bold text-amber-600">
                  {statistics.leave_days}
                  {statistics.approved_leave_days > 0 && (
                    <span className="text-sm font-normal"> ({statistics.approved_leave_days} approved)</span>
                  )}
                </div>
              </div>
              <div className="bg-sky-50 p-4 rounded-lg border border-sky-200">
                <div className="text-sm text-sky-700 mb-1">Attendance Rate</div>
                <div className="text-2xl font-heading font-bold text-sky-600">{statistics.attendance_rate}%</div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              * Leave days include approved leave requests. Attendance rate = (Present days / Total days) × 100
            </p>
          </CardContent>
        </Card>
      )}

      {/* Today's Attendance */}
      {!selectedEmployeeId && (
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
      )}

      {/* Attendance History */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-heading">
            Attendance History
            {attendance.length > 0 && (
              <span className="text-sm font-normal text-slate-500 ml-2">({attendance.length} records)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {attendance.slice(0, 50).map((record) => (
                <div key={record.attendance_id} className="flex justify-between items-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="font-medium text-slate-900">{record.date}</div>
                    <div className="text-sm text-slate-500">
                      {record.check_in && `Check-in: ${new Date(record.check_in).toLocaleTimeString()}`}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    record.status === 'Present' ? 'bg-emerald-50 text-emerald-600' :
                    record.status === 'Absent' ? 'bg-rose-50 text-rose-600' :
                    record.status === 'Leave' ? 'bg-amber-50 text-amber-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {record.status === 'Present' && <CheckCircle className="h-4 w-4 mr-1" />}
                    {record.status === 'Absent' && <XCircle className="h-4 w-4 mr-1" />}
                    {record.status === 'Leave' && <Clock className="h-4 w-4 mr-1" />}
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-600 py-8">No attendance records found for the selected filters</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
