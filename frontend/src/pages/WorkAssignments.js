import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, GripVertical, Trash2, Clock, AlertCircle } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import ConfirmDialog from '@/components/ConfirmDialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function WorkAssignments() {
  const { user } = useOutletContext();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '', description: '', assigned_to: '', due_date: '', priority: 'Medium', status: 'Today'
  });

  useEffect(() => {
    fetchTasks();
    if (user && user.role === 'Admin') {
      fetchEmployees();
      fetchUsers();
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks`, { credentials: 'include' });
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
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

  const fetchUsers = async () => {
    try {
      // We'll need a users endpoint or use employees
      // For now, we'll use employees as a proxy
      setUsers(employees);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        toast.success('Task created successfully');
        setDialogOpen(false);
        setFormData({ title: '', description: '', assigned_to: '', due_date: '', priority: 'Medium', status: 'Today' });
        fetchTasks();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to create task');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteClick = (task) => {
    setSelectedTask(task);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks/${selectedTask.task_id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        toast.success('Task deleted successfully');
        setDeleteDialogOpen(false);
        setSelectedTask(null);
        fetchTasks();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to delete task');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const isAdmin = user && user.role === 'Admin';
  const columns = ['Today', 'In Progress', 'Completed'];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-rose-50 text-rose-600 border-rose-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'Low':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div data-testid="work-assignments-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">
            {isAdmin ? 'Work Assignments' : 'My Tasks'}
          </h1>
          <p className="text-slate-600">
            {isAdmin ? 'Manage and assign tasks to team members' : 'View and update your assigned tasks'}
          </p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-task-btn" className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Work Assignment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <Input
                    data-testid="task-title-input"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <Textarea
                    data-testid="task-description-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    required
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
                  <Select value={formData.assigned_to} onValueChange={(val) => setFormData({...formData, assigned_to: val})}>
                    <SelectTrigger data-testid="task-assign-to-select">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.employee_id} value={emp.user_id || emp.employee_id}>
                          {emp.name} - {emp.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <Input
                    data-testid="task-due-date-input"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <Select value={formData.priority} onValueChange={(val) => setFormData({...formData, priority: val})}>
                    <SelectTrigger data-testid="task-priority-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" data-testid="task-submit-btn" className="w-full bg-slate-900 hover:bg-slate-800">
                  Create Task
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Task"
        description={`Are you sure you want to delete "${selectedTask?.title}"? This action cannot be undone.`}
      />

      {/* Kanban Board */}
      <div className="grid md:grid-cols-3 gap-6">
        {columns.map((column) => (
          <div key={column} className="space-y-4">
            <div className="bg-slate-100 p-3 rounded-lg">
              <h3 className="font-heading font-semibold text-slate-900">{column}</h3>
              <p className="text-sm text-slate-500">
                {tasks.filter(t => t.status === column).length} tasks
              </p>
            </div>
            <div className="space-y-3 min-h-[400px]">
              {tasks.filter(t => t.status === column).map((task) => {
                const overdue = isOverdue(task.due_date) && column !== 'Completed';
                return (
                  <Card key={task.task_id} data-testid="task-card" className={`border-slate-200 hover:shadow-lg transition-shadow duration-300 cursor-move ${overdue ? 'border-l-4 border-l-rose-500' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-2 flex-1">
                          <GripVertical className="h-4 w-4 text-slate-400 mt-1" />
                          <div className="flex-1">
                            <CardTitle className="text-base font-heading mb-2">{task.title}</CardTitle>
                            <div className="flex flex-wrap gap-2">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              {overdue && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Overdue
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            data-testid="delete-task-btn"
                            onClick={() => handleDeleteClick(task)}
                            className="h-8 w-8 p-0 ml-2"
                          >
                            <Trash2 className="h-4 w-4 text-rose-600" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-slate-600">{task.description}</p>
                      <div className="flex items-center text-xs text-slate-500">
                        <Clock className="h-3 w-3 mr-1" />
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </div>
                      <Select value={task.status} onValueChange={(val) => updateTaskStatus(task.task_id, val)}>
                        <SelectTrigger className="h-8 text-xs" data-testid="task-status-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Today">Today</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">
              {isAdmin ? 'No tasks created yet. Create your first task to get started!' : 'No tasks assigned to you yet.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
