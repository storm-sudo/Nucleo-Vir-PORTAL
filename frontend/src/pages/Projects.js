import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import ConfirmDialog from '@/components/ConfirmDialog';

import { BACKEND_URL } from '@/config';

export default function Projects() {
  const { user } = useOutletContext();
  const [projects, setProjects] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', status: 'Todo' });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects`, { credentials: 'include' });
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        toast.success('Project created');
        setDialogOpen(false);
        setFormData({ title: '', description: '', status: 'Todo' });
        fetchProjects();
      } else {
        toast.error('Failed to create project');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const updateStatus = async (projectId, status) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        fetchProjects();
      }
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const handleDeleteClick = (project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/projects/${selectedProject.project_id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        toast.success('Project deleted successfully');
        setDeleteDialogOpen(false);
        setSelectedProject(null);
        fetchProjects();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to delete project');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const columns = ['Todo', 'In Progress', 'Done'];
  const canDelete = user && user.role === 'Admin';

  return (
    <div data-testid="projects-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Projects</h1>
          <p className="text-slate-600">Manage projects with Kanban board</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-project-btn" className="bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <Input
                  data-testid="project-title-input"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <Textarea
                  data-testid="project-description-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                  rows={3}
                />
              </div>
              <Button type="submit" data-testid="project-submit-btn" className="w-full bg-slate-900 hover:bg-slate-800">
                Create Project
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Project"
        description={`Are you sure you want to delete "${selectedProject?.title}"? This action cannot be undone.`}
      />

      <div className="grid md:grid-cols-3 gap-6">
        {columns.map((column) => (
          <div key={column} className="space-y-4">
            <div className="bg-slate-100 p-3 rounded-lg">
              <h3 className="font-heading font-semibold text-slate-900">{column}</h3>
              <p className="text-sm text-slate-500">
                {projects.filter(p => p.status === column).length} tasks
              </p>
            </div>
            <div className="space-y-3">
              {projects.filter(p => p.status === column).map((project) => (
                <Card key={project.project_id} data-testid="project-card" className="border-slate-200 hover:shadow-lg transition-shadow duration-300 cursor-move">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2 flex-1">
                        <GripVertical className="h-4 w-4 text-slate-400 mt-1" />
                        <CardTitle className="text-base font-heading flex-1">{project.title}</CardTitle>
                      </div>
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          data-testid="delete-project-btn"
                          onClick={() => handleDeleteClick(project)}
                          className="h-8 w-8 p-0 ml-2"
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-3">{project.description}</p>
                    <Select value={project.status} onValueChange={(val) => updateStatus(project.project_id, val)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todo">Todo</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}