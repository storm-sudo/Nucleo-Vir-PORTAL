import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Clock, Columns, Trash2 } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import ConfirmDialog from '@/components/ConfirmDialog';
import KanbanBoard from '@/components/KanbanBoard';
import { BACKEND_URL } from '@/config';

const DEFAULT_COLUMNS = [
  { id: 'backlog', name: 'Backlog', order: 0 },
  { id: 'today', name: 'Today', order: 1 },
  { id: 'in-progress', name: 'In Progress', order: 2 },
  { id: 'review', name: 'Review', order: 3 },
  { id: 'completed', name: 'Completed', order: 4 }
];

export default function WorkAssignments() {
  const { user } = useOutletContext();
  const [tasks, setTasks] = useState([]);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [employees, setEmployees] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [formData, setFormData] = useState({ title: '', description: '', assigned_to: '', due_date: '', priority: 'Medium', status: 'Backlog' });

  useEffect(() => { fetchTasks(); fetchColumns(); if (user && ['Admin', 'SuperAdmin'].includes(user.role)) fetchEmployees(); }, [user]);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks`, { credentials: 'include' });
      const data = await response.json();
      const employeeResponse = await fetch(`${BACKEND_URL}/api/employees`, { credentials: 'include' });
      const employeesData = await employeeResponse.json();
      const tasksWithNames = data.map(task => {
        const emp = employeesData.find(e => e.user_id === task.assigned_to || e.employee_id === task.assigned_to);
        return { ...task, assigned_to_name: emp?.name || 'Unassigned' };
      });
      setTasks(tasksWithNames);
    } catch (error) { console.error('Error:', error); }
  };

  const fetchColumns = async () => { try { const response = await fetch(`${BACKEND_URL}/api/kanban/columns`, { credentials: 'include' }); if (response.ok) { const data = await response.json(); if (data.length > 0) setColumns(data); } } catch (error) { console.error('Error:', error); } };
  const fetchEmployees = async () => { try { const response = await fetch(`${BACKEND_URL}/api/employees`, { credentials: 'include' }); setEmployees(await response.json()); } catch (error) { console.error('Error:', error); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(formData) });
      if (response.ok) { toast.success('Task created'); setDialogOpen(false); setFormData({ title: '', description: '', assigned_to: '', due_date: '', priority: 'Medium', status: 'Backlog' }); fetchTasks(); }
      else toast.error('Failed');
    } catch (error) { toast.error('Error'); }
  };

  const handleTaskMove = async (taskId, newStatus) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status: newStatus }) });
      if (response.ok) setTasks(prev => prev.map(task => task.task_id === taskId ? { ...task, status: newStatus } : task));
    } catch (error) { fetchTasks(); }
  };

  const handleDeleteClick = (task) => { setSelectedTask(task); setDeleteDialogOpen(true); };
  const handleDelete = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks/${selectedTask.task_id}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) { toast.success('Deleted'); setDeleteDialogOpen(false); setSelectedTask(null); fetchTasks(); } else toast.error('Failed');
    } catch (error) { toast.error('Error'); }
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    const newColumn = { id: newColumnName.toLowerCase().replace(/\s+/g, '-'), name: newColumnName, order: columns.length };
    try {
      const response = await fetch(`${BACKEND_URL}/api/kanban/columns`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(newColumn) });
      if (response.ok) { setColumns([...columns, newColumn]); setNewColumnName(''); setColumnDialogOpen(false); toast.success('Column added'); }
    } catch (error) { toast.error('Failed'); }
  };

  const handleDeleteColumn = async (columnId) => {
    if (columns.length <= 3) { toast.error('Minimum 3 columns'); return; }
    try {
      const response = await fetch(`${BACKEND_URL}/api/kanban/columns/${columnId}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) { setColumns(columns.filter(c => c.id !== columnId)); toast.success('Deleted'); }
    } catch (error) { toast.error('Failed'); }
  };

  const isAdmin = user && ['Admin', 'SuperAdmin'].includes(user.role);

  return (
    <div data-testid="work-assignments-page" className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-white">{isAdmin ? 'Work Assignments' : 'My Tasks'}</h1>
          <p className="text-gray-600 dark:text-slate-400">{isAdmin ? 'Manage and assign tasks' : 'View your assigned tasks'}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Dialog open={columnDialogOpen} onOpenChange={setColumnDialogOpen}>
                <DialogTrigger asChild><Button variant="outline" className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"><Columns className="h-4 w-4 mr-2" />Add Column</Button></DialogTrigger>
                <DialogContent className="max-w-md bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                  <DialogHeader><DialogTitle className="text-gray-900 dark:text-white">Add New Column</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Column Name</label><Input value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} placeholder="e.g., Blocked" className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" /></div>
                    <Button onClick={handleAddColumn} className="w-full bg-gradient-to-r from-[#FF3D33] to-[#215F9A] text-white border-0">Add Column</Button>
                    <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Current Columns:</p>
                      <div className="space-y-2">
                        {columns.map(col => (
                          <div key={col.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-700 rounded border border-gray-200 dark:border-slate-600">
                            <span className="text-sm text-gray-900 dark:text-slate-200">{col.name}</span>
                            {columns.length > 3 && (<Button size="sm" variant="ghost" onClick={() => handleDeleteColumn(col.id)} className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="h-3 w-3" /></Button>)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild><Button className="bg-gradient-to-r from-[#FF3D33] to-[#215F9A] text-white border-0"><Plus className="h-4 w-4 mr-2" />Create Task</Button></DialogTrigger>
                <DialogContent className="max-w-lg bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                  <DialogHeader><DialogTitle className="text-gray-900 dark:text-white">Create Work Assignment</DialogTitle></DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Title</label><Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label><Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required rows={3} className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" /></div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Assign To</label>
                      <Select value={formData.assigned_to} onValueChange={(val) => setFormData({...formData, assigned_to: val})}>
                        <SelectTrigger className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">{employees.map((emp) => (<SelectItem key={emp.employee_id} value={emp.user_id || emp.employee_id}>{emp.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Status</label>
                      <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                        <SelectTrigger className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">{columns.map(col => (<SelectItem key={col.id} value={col.name}>{col.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Due Date</label><Input type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} required className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white" /></div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Priority</label>
                      <Select value={formData.priority} onValueChange={(val) => setFormData({...formData, priority: val})}>
                        <SelectTrigger className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full bg-gradient-to-r from-[#FF3D33] to-[#215F9A] text-white border-0">Create Task</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={handleDelete} title="Delete Task" description={`Delete "${selectedTask?.title}"?`} />

      {tasks.length > 0 || isAdmin ? (
        <div className="overflow-x-auto pb-4"><KanbanBoard tasks={tasks} columns={columns} onTaskMove={handleTaskMove} onDeleteTask={handleDeleteClick} isAdmin={isAdmin} /></div>
      ) : (
        <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
          <CardContent className="py-12 text-center"><Clock className="h-12 w-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" /><p className="text-gray-600 dark:text-slate-400">No tasks assigned to you yet.</p></CardContent>
        </Card>
      )}
    </div>
  );
}
