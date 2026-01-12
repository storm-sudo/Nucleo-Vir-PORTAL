import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Microscope } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function LabNotebook() {
  const [entries, setEntries] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', tags: '' });

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/lab-notebook`, { credentials: 'include' });
      const data = await response.json();
      setEntries(data);
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      const response = await fetch(`${BACKEND_URL}/api/lab-notebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...formData, tags })
      });
      
      if (response.ok) {
        toast.success('Entry created');
        setDialogOpen(false);
        setFormData({ title: '', content: '', tags: '' });
        fetchEntries();
      } else {
        toast.error('Failed to create entry');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  return (
    <div data-testid="lab-notebook-page" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Lab Notebook</h1>
          <p className="text-slate-600">Document experiments, SOPs, and research notes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-entry-btn" className="bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Lab Notebook Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <Input
                  data-testid="entry-title-input"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                <Textarea
                  data-testid="entry-content-textarea"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  required
                  rows={10}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma-separated)</label>
                <Input
                  data-testid="entry-tags-input"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  placeholder="SOP, Experiment, Protocol"
                />
              </div>
              <Button type="submit" data-testid="entry-submit-btn" className="w-full bg-slate-900 hover:bg-slate-800">
                Create Entry
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {entries.map((entry) => (
          <Card key={entry.entry_id} data-testid="notebook-entry-card" className="border-slate-200">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-heading">{entry.title}</CardTitle>
                <span className="text-sm text-slate-500">{entry.date}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-slate-600 whitespace-pre-wrap">{entry.content}</p>
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag, idx) => (
                    <span key={idx} className="inline-block px-2 py-1 text-xs font-medium bg-sky-50 text-sky-600 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {entries.length === 0 && (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center">
            <Microscope className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No lab notebook entries found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}