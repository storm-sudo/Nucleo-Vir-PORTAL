import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import "@/App.css";
import Landing from '@/pages/Landing';
import AuthCallback from '@/pages/AuthCallback';
import Dashboard from '@/pages/Dashboard';
import Employees from '@/pages/Employees';
import Attendance from '@/pages/Attendance';
import LeaveRequests from '@/pages/LeaveRequests';
import Payroll from '@/pages/Payroll';
import PaymentRequests from '@/pages/PaymentRequests';
import Projects from '@/pages/Projects';
import LabNotebook from '@/pages/LabNotebook';
import LabInventory from '@/pages/LabInventory';
import EquipmentSchedule from '@/pages/EquipmentSchedule';
import Chat from '@/pages/Chat';
import Calendar from '@/pages/Calendar';
import Helpdesk from '@/pages/Helpdesk';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { Toaster } from '@/components/ui/sonner';

function AppRouter() {
  const location = useLocation();
  
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      
      <Route path="/app" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="employees" element={<Employees />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="leave-requests" element={<LeaveRequests />} />
        <Route path="payroll" element={<Payroll />} />
        <Route path="payment-requests" element={<PaymentRequests />} />
        <Route path="projects" element={<Projects />} />
        <Route path="lab-notebook" element={<LabNotebook />} />
        <Route path="lab-inventory" element={<LabInventory />} />
        <Route path="equipment-schedule" element={<EquipmentSchedule />} />
        <Route path="chat" element={<Chat />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="helpdesk" element={<Helpdesk />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;