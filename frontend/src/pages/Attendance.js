import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Download, Search, TrendingUp, Upload, FileSpreadsheet, Briefcase } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

import { BACKEND_URL } from '@/config';

export default function Attendance() {
  const { user } = useOutletContext();
  const [attendance, setAttendance] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [todayMarked, setTodayMarked] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('self');
  const [searchMonth, setSearchMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchAttendance();
    fetchLeaveBalance();
    if (user && user.role === 'Admin') fetchEmployees();
  }, [user]);

  useEffect(() => {
    if (searchMonth || selectedEmployeeId) fetchStatistics();
  }, [searchMonth, selectedEmployeeId]);

  const fetchAttendance = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/attendance/heatmap`, { credentials: 'include' });
      const data = await response.json();
      setAttendance(data);
      const today = new Date().toISOString().split('T')[0];
      setTodayMarked(data.some(record => record.date === today));
    } catch (error) { console.error('Error fetching attendance:', error); }
  };

  const fetchLeaveBalance = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedEmployeeId && selectedEmployeeId !== 'self' && user?.role === 'Admin') params.append('user_id', selectedEmployeeId);
      const response = await fetch(`${BACKEND_URL}/api/leave-balance?${params}`, { credentials: 'include' });
      setLeaveBalance(await response.json());
    } catch (error) { console.error('Error fetching leave balance:', error); }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/employees`, { credentials: 'include' });
      setEmployees(await response.json());
    } catch (error) { console.error('Error fetching employees:', error); }
  };

  const fetchStatistics = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedEmployeeId && selectedEmployeeId !== 'self' && user.role === 'Admin') params.append('user_id', selectedEmployeeId);
      if (searchMonth) params.append('month', searchMonth);
      const response = await fetch(`${BACKEND_URL}/api/attendance/statistics?${params}`, { credentials: 'include' });
      setStatistics(await response.json());
    } catch (error) { console.error('Error fetching statistics:', error); }
  };

  const handleSearch = async () => {
    if (!startDate && !endDate && !searchMonth) { fetchAttendance(); return; }
    try {
      const params = new URLSearchParams();
      if (selectedEmployeeId && selectedEmployeeId !== 'self' && user.role === 'Admin') params.append('user_id', selectedEmployeeId);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const response = await fetch(`${BACKEND_URL}/api/attendance/search?${params}`, { credentials: 'include' });
      setAttendance(await response.json());
    } catch (error) { console.error('Error searching attendance:', error); }
  };

  const handleMarkAttendance = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/attendance`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status: 'Present' })
      });
      if (response.ok) { toast.success('Attendance marked successfully'); fetchAttendance(); fetchStatistics(); }
      else toast.error('Failed to mark attendance');
    } catch (error) { toast.error('An error occurred'); }
  };

  const handleExportAttendance = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/attendance/export`, { credentials: 'include' });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `attendance_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
        toast.success('Attendance data exported successfully');
      } else toast.error('Failed to export attendance');
    } catch (error) { toast.error('An error occurred'); }
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Please upload a CSV file'); return; }
    setUploading(true);
    const formData = new FormData(); formData.append('file', file);
    try {
      const response = await fetch(`${BACKEND_URL}/api/attendance/upload-csv`, { method: 'POST', credentials: 'include', body: formData });
      const data = await response.json();
      if (response.ok) { toast.success(`Successfully imported ${data.imported_count} attendance records`); fetchAttendance(); fetchStatistics(); }
      else toast.error(data.detail || 'Failed to upload CSV');
    } catch (error) { toast.error('An error occurred during upload'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const isAdmin = user && user.role === 'Admin';

  return (
    <div data-testid="attendance-page" className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">Attendance</h1>
          <p className="text-slate-400">Track your attendance and view history</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} onChange={handleCSVUpload} accept=".csv" className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="upload-csv-btn" className="bg-gradient-to-r from-[#FF3D33] to-[#215F9A] hover:from-[#e63529] hover:to-[#1a4d7a] text-white border-0">
              <Upload className="h-4 w-4 mr-2" />{uploading ? 'Uploading...' : 'Upload CSV'}
            </Button>
            <Button onClick={handleExportAttendance} data-testid="export-attendance-btn" className="bg-slate-700 hover:bg-slate-600 text-white">
              <Download className="h-4 w-4 mr-2" />Download CSV
            </Button>
          </div>
        )}
      </div>

      {/* Leave Balance */}
      {leaveBalance && (
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center text-white">
              <Briefcase className="h-5 w-5 mr-2 text-[#FF3D33]" />Leave Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-[#215F9A]/20 to-[#163E64]/20 p-4 rounded-xl border border-[#215F9A]/30">
                <div className="text-sm text-slate-300 mb-1">Earned Leave (EL/PL)</div>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-white">{leaveBalance.earned_leave?.remaining || 0}</span>
                  <span className="text-sm text-slate-400 ml-1">/ {leaveBalance.earned_leave?.total || 15}</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 p-4 rounded-xl border border-emerald-500/30">
                <div className="text-sm text-slate-300 mb-1">Casual Leave (CL)</div>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-white">{leaveBalance.casual_leave?.remaining || 0}</span>
                  <span className="text-sm text-slate-400 ml-1">/ {leaveBalance.casual_leave?.total || 10}</span>
                </div>
              </div>
              <div className="bg-gradient-to-br from-[#FF3D33]/20 to-orange-500/20 p-4 rounded-xl border border-[#FF3D33]/30">
                <div className="text-sm text-slate-300 mb-1">Sick Leave (SL)</div>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-white">{leaveBalance.sick_leave?.remaining || 0}</span>
                  <span className="text-sm text-slate-400 ml-1">/ {leaveBalance.sick_leave?.total || 10}</span>
                </div>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-xl border border-slate-600/50">
                <div className="text-sm text-slate-300 mb-1">Total Remaining</div>
                <div className="text-2xl font-bold text-white">
                  {(leaveBalance.earned_leave?.remaining || 0) + (leaveBalance.casual_leave?.remaining || 0) + (leaveBalance.sick_leave?.remaining || 0)} days
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CSV Instructions */}
      {isAdmin && (
        <Card className="bg-slate-800/50 border-slate-700/50 border-l-4 border-l-[#FF3D33]">
          <CardContent className="py-4">
            <div className="flex items-start space-x-3">
              <FileSpreadsheet className="h-5 w-5 text-[#FF3D33] mt-0.5" />
              <div>
                <p className="font-medium text-white">CSV Upload Format</p>
                <p className="text-sm text-slate-400">Upload biometric attendance CSV with columns: <code className="bg-slate-700 px-1 rounded text-slate-300">Emp ID, Date and Time, In Time, Out Time</code></p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader><CardTitle className="text-lg font-heading flex items-center text-white"><Search className="h-5 w-5 mr-2 text-[#215F9A]" />Search Attendance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Employee</label>
                <Select value={selectedEmployeeId} onValueChange={(val) => { setSelectedEmployeeId(val); fetchLeaveBalance(); }}>
                  <SelectTrigger className="bg-slate-900 border-slate-600 text-white"><SelectValue placeholder="All employees" /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="self">My Attendance</SelectItem>
                    {employees.map((emp) => (<SelectItem key={emp.employee_id} value={emp.user_id || emp.employee_id}>{emp.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Month</label><Input type="month" value={searchMonth} onChange={(e) => setSearchMonth(e.target.value)} className="bg-slate-900 border-slate-600 text-white" /></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-900 border-slate-600 text-white" /></div>
            <div><label className="block text-sm font-medium text-slate-300 mb-1">End Date</label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-900 border-slate-600 text-white" /></div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleSearch} className="bg-gradient-to-r from-[#FF3D33] to-[#215F9A] text-white border-0"><Search className="h-4 w-4 mr-2" />Search</Button>
            <Button onClick={() => { setSearchMonth(''); setStartDate(''); setEndDate(''); setSelectedEmployeeId('self'); fetchAttendance(); setStatistics(null); fetchLeaveBalance(); }} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">Clear</Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {statistics && (
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader><CardTitle className="text-lg font-heading flex items-center text-white"><TrendingUp className="h-5 w-5 mr-2 text-[#215F9A]" />Statistics {searchMonth && `- ${searchMonth}`}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Total Days', value: statistics.total_days, color: 'slate' },
                { label: 'Present', value: statistics.present_days, color: 'emerald' },
                { label: 'Absent', value: statistics.absent_days, color: 'rose' },
                { label: 'Leave', value: statistics.leave_days, color: 'amber' },
                { label: 'Attendance Rate', value: `${statistics.attendance_rate}%`, color: 'sky' }
              ].map((stat, i) => (
                <div key={i} className={`bg-${stat.color}-500/10 p-4 rounded-xl border border-${stat.color}-500/20`}>
                  <div className="text-sm text-slate-400 mb-1">{stat.label}</div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Attendance */}
      {(!selectedEmployeeId || selectedEmployeeId === 'self') && (
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader><CardTitle className="text-lg font-heading text-white">Today's Attendance</CardTitle></CardHeader>
          <CardContent>
            {!todayMarked ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">You haven't marked your attendance today</p>
                <Button onClick={handleMarkAttendance} className="bg-gradient-to-r from-[#FF3D33] to-[#215F9A] text-white border-0"><CheckCircle className="h-4 w-4 mr-2" />Mark Present</Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                <p className="text-slate-400">Attendance marked for today</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader><CardTitle className="text-lg font-heading text-white">Attendance History <span className="text-sm font-normal text-slate-400">({attendance.length} records)</span></CardTitle></CardHeader>
        <CardContent>
          {attendance.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {attendance.slice(0, 50).map((record) => (
                <div key={record.attendance_id} className="flex justify-between items-center p-3 bg-slate-700/30 border border-slate-600/50 rounded-lg hover:bg-slate-700/50 transition-colors">
                  <div>
                    <div className="font-medium text-white">{record.date}</div>
                    <div className="text-sm text-slate-400">
                      {record.check_in && `In: ${new Date(record.check_in).toLocaleTimeString()}`}
                      {record.check_out && ` | Out: ${new Date(record.check_out).toLocaleTimeString()}`}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    record.status === 'Present' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    record.status === 'Absent' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {record.status === 'Present' && <CheckCircle className="h-4 w-4 mr-1" />}
                    {record.status === 'Absent' && <XCircle className="h-4 w-4 mr-1" />}
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-400 py-8">No attendance records found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
