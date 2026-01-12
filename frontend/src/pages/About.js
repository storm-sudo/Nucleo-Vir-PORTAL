import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BookOpen, Users, Clock, DollarSign, Microscope, Package, MessageSquare, Calendar, ClipboardList, FolderKanban, Mail } from 'lucide-react';

export default function About() {
  const modules = [
    {
      icon: Users,
      title: 'Employee Management',
      description: 'Manage employee records, onboarding, and profile information.',
      usage: 'Admins and HR can add new employees, which automatically generates employee IDs and sends onboarding emails. View employee details including department, role, and contact information.'
    },
    {
      icon: Clock,
      title: 'Attendance & Leave',
      description: 'Track daily attendance and manage leave requests.',
      usage: 'Mark your attendance daily by clicking "Mark Present". Submit leave requests specifying type (Casual/Sick/Vacation), dates, and reason. Admins/HR can approve or reject requests.'
    },
    {
      icon: DollarSign,
      title: 'Payroll',
      description: 'View salary records and payslips.',
      usage: 'Employees can view their payroll history including basic salary, deductions, bonuses, and net pay. Admins/HR manage payroll records for all employees.'
    },
    {
      icon: DollarSign,
      title: 'Payment Requests',
      description: 'CA workflow for payment processing.',
      usage: 'Chartered Accountants create payment requests with amount and description. Admins and Accountants review and approve/reject requests. Approved requests trigger email notifications.'
    },
    {
      icon: FolderKanban,
      title: 'Project Management',
      description: 'Trello-style Kanban board for project tracking.',
      usage: 'Create projects with title and description. Move projects between Todo, In Progress, and Done columns. Admins can delete projects.'
    },
    {
      icon: Microscope,
      title: 'Lab Notebook',
      description: 'Digital notebook for research documentation.',
      usage: 'Create daily lab entries with title, content, and tags (e.g., SOP, Experiment). Search and filter entries by tags. Owners and admins can delete entries.'
    },
    {
      icon: Package,
      title: 'Lab Inventory',
      description: 'Equipment and reagent management.',
      usage: 'View inventory items with quantity and location. Employees can request items by specifying quantity and reason. HR/Admins approve or reject requests and manage inventory.'
    },
    {
      icon: Calendar,
      title: 'Equipment Scheduling',
      description: 'Book lab equipment with calendar.',
      usage: 'Reserve equipment by selecting equipment name, start/end time, and purpose. View all bookings to avoid conflicts.'
    },
    {
      icon: MessageSquare,
      title: 'Team Chat',
      description: 'Group-based messaging system.',
      usage: 'Join groups created by admins. Send messages in real-time. Messages auto-refresh every 5 seconds. Admins can create and delete groups.'
    },
    {
      icon: Calendar,
      title: 'Calendar & Events',
      description: 'Schedule meetings and events.',
      usage: 'Admins create events with title, description, date/time, and attendees. All employees can view scheduled events.'
    },
    {
      icon: ClipboardList,
      title: 'Helpdesk',
      description: 'Support ticketing system.',
      usage: 'Create tickets with subject, description, category (Technical/HR/Admin/Other), and priority (Low/Medium/High). HR/Admins manage ticket status (Open/In Progress/Resolved/Closed).'
    }
  ];

  return (
    <div data-testid="about-page" className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900 mb-2">Portal Guide</h1>
        <p className="text-slate-600">Welcome to the Nucleo-vir Therapeutics Enterprise Portal</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl font-heading">Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            The Nucleo-vir Portal is an integrated enterprise management platform designed specifically for biotech organizations. 
            It combines HR management, lab operations, project tracking, and communication tools in one seamless interface.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 pt-4">
            <div className="bg-sky-50 p-4 rounded-lg">
              <h4 className="font-heading font-semibold text-slate-900 mb-2">Role-Based Access</h4>
              <p className="text-sm text-slate-600">
                Different features are available based on your role: Admin (full access), HR (employee management), 
                Employee (basic features), Accountant (payment approvals), CA (payment requests).
              </p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-lg">
              <h4 className="font-heading font-semibold text-slate-900 mb-2">Getting Started</h4>
              <p className="text-sm text-slate-600">
                Use the sidebar navigation to access different modules. Your dashboard shows key statistics and quick actions 
                for the most common tasks.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl font-heading">Module Guides</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {modules.map((module, idx) => {
              const Icon = module.icon;
              return (
                <AccordionItem key={idx} value={`item-${idx}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-sky-50">
                        <Icon className="h-5 w-5 text-sky-500" />
                      </div>
                      <div className="text-left">
                        <div className="font-heading font-semibold text-slate-900">{module.title}</div>
                        <div className="text-sm text-slate-500">{module.description}</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-14 pr-4 pb-4 text-slate-600 leading-relaxed">
                      {module.usage}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl font-heading">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <ClipboardList className="h-5 w-5 text-sky-500 mt-1" />
            <div>
              <div className="font-medium text-slate-900">Create a Helpdesk Ticket</div>
              <p className="text-sm text-slate-600">For technical issues or questions, submit a ticket through the Helpdesk module.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Mail className="h-5 w-5 text-sky-500 mt-1" />
            <div>
              <div className="font-medium text-slate-900">Contact Support</div>
              <p className="text-sm text-slate-600">Email: nikita@nucleovir.com</p>
            </div>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-900">
              <strong>Note:</strong> Only authorized @nucleovir.com email addresses can access this portal. 
              Admin access is restricted to whitelisted users.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}