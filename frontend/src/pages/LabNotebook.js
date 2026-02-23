import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Microscope, Search, Tag, Clock, FileText, History, Users, Edit, Eye, Trash2, Copy } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import RichTextEditor from '@/components/RichTextEditor';
import ConfirmDialog from '@/components/ConfirmDialog';

import { BACKEND_URL } from '@/config';

const EXPERIMENT_TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank Entry',
    content: ''
  },
  {
    id: 'experiment',
    name: 'Experiment Protocol',
    content: `<h2>Experiment Title</h2>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Researcher:</strong> </p>

<h3>Objective</h3>
<p>Describe the purpose of this experiment...</p>

<h3>Materials & Methods</h3>
<ul>
<li>Material 1</li>
<li>Material 2</li>
</ul>

<h3>Procedure</h3>
<ol>
<li>Step 1</li>
<li>Step 2</li>
<li>Step 3</li>
</ol>

<h3>Results</h3>
<p>Document your findings here...</p>

<h3>Conclusions</h3>
<p>Summarize what you learned...</p>

<h3>Next Steps</h3>
<p>What follow-up experiments are needed?</p>`
  },
  {
    id: 'sop',
    name: 'Standard Operating Procedure',
    content: `<h2>SOP Title</h2>
<p><strong>Version:</strong> 1.0</p>
<p><strong>Effective Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Author:</strong> </p>

<h3>Purpose</h3>
<p>Describe the purpose of this SOP...</p>

<h3>Scope</h3>
<p>Define what this SOP covers...</p>

<h3>Responsibilities</h3>
<ul>
<li>Role 1: Responsibility</li>
<li>Role 2: Responsibility</li>
</ul>

<h3>Equipment & Materials</h3>
<ul>
<li>Equipment 1</li>
<li>Material 1</li>
</ul>

<h3>Procedure</h3>
<ol>
<li>Step 1</li>
<li>Step 2</li>
<li>Step 3</li>
</ol>

<h3>Safety Considerations</h3>
<p>List any safety precautions...</p>

<h3>References</h3>
<p>Related documents and standards...</p>`
  },
  {
    id: 'meeting',
    name: 'Meeting Notes',
    content: `<h2>Meeting Notes</h2>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Attendees:</strong> </p>

<h3>Agenda</h3>
<ul>
<li>Topic 1</li>
<li>Topic 2</li>
</ul>

<h3>Discussion Points</h3>
<p>Summary of discussions...</p>

<h3>Action Items</h3>
<table>
<tr><th>Task</th><th>Assigned To</th><th>Due Date</th></tr>
<tr><td>Task 1</td><td>Name</td><td>Date</td></tr>
</table>

<h3>Next Meeting</h3>
<p>Date and time of next meeting...</p>`
  }
];

export default function LabNotebook() {
  const { user } = useOutletContext();
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [allTags, setAllTags] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', 
    content: '', 
    tags: '',
    template: 'blank'
  });

  useEffect(() => {
    fetchEntries();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [entries, searchTerm, selectedTag]);

  const fetchEntries = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/lab-notebook`, { credentials: 'include' });
      const data = await response.json();
      setEntries(data);
      
      // Extract unique tags
      const tags = new Set();
      data.forEach(entry => {
        if (entry.tags) {
          entry.tags.forEach(tag => tags.add(tag));
        }
      });
      setAllTags(Array.from(tags));
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };

  const filterEntries = () => {
    let filtered = [...entries];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.title.toLowerCase().includes(term) ||
        entry.content.toLowerCase().includes(term) ||
        (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(term)))
      );
    }
    
    if (selectedTag && selectedTag !== 'all') {
      filtered = filtered.filter(entry => 
        entry.tags && entry.tags.includes(selectedTag)
      );
    }
    
    setFilteredEntries(filtered);
  };

  const handleTemplateChange = (templateId) => {
    const template = EXPERIMENT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        template: templateId,
        content: template.content
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      
      const url = isEditing 
        ? `${BACKEND_URL}/api/lab-notebook/${selectedEntry.entry_id}`
        : `${BACKEND_URL}/api/lab-notebook`;
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          title: formData.title,
          content: formData.content, 
          tags 
        })
      });
      
      if (response.ok) {
        toast.success(isEditing ? 'Entry updated' : 'Entry created');
        setDialogOpen(false);
        setIsEditing(false);
        setSelectedEntry(null);
        setFormData({ title: '', content: '', tags: '', template: 'blank' });
        fetchEntries();
      } else {
        toast.error('Failed to save entry');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleEdit = (entry) => {
    setSelectedEntry(entry);
    setFormData({
      title: entry.title,
      content: entry.content,
      tags: entry.tags ? entry.tags.join(', ') : '',
      template: 'blank'
    });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleView = (entry) => {
    setSelectedEntry(entry);
    setViewDialogOpen(true);
  };

  const handleViewHistory = async (entry) => {
    setSelectedEntry(entry);
    try {
      const response = await fetch(`${BACKEND_URL}/api/lab-notebook/${entry.entry_id}/history`, { 
        credentials: 'include' 
      });
      if (response.ok) {
        const data = await response.json();
        setVersionHistory(data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
    setHistoryDialogOpen(true);
  };

  const handleDeleteClick = (entry) => {
    setSelectedEntry(entry);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/lab-notebook/${selectedEntry.entry_id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        toast.success('Entry deleted');
        setDeleteDialogOpen(false);
        setSelectedEntry(null);
        fetchEntries();
      } else {
        toast.error('Failed to delete entry');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleDuplicate = (entry) => {
    setFormData({
      title: `${entry.title} (Copy)`,
      content: entry.content,
      tags: entry.tags ? entry.tags.join(', ') : '',
      template: 'blank'
    });
    setIsEditing(false);
    setDialogOpen(true);
  };

  return (
    <div data-testid="lab-notebook-page" className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-white">Lab Notebook</h1>
          <p className="text-slate-600 dark:text-slate-400">Document experiments, SOPs, and research notes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setIsEditing(false);
            setSelectedEntry(null);
            setFormData({ title: '', content: '', tags: '', template: 'blank' });
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="create-entry-btn" className="bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-700">
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Entry' : 'Create Lab Notebook Entry'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Template</label>
                  <Select value={formData.template} onValueChange={handleTemplateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERIMENT_TEMPLATES.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <Input
                  data-testid="entry-title-input"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content</label>
                <RichTextEditor
                  content={formData.content}
                  onChange={(content) => setFormData({...formData, content})}
                  placeholder="Start documenting your research..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tags (comma-separated)</label>
                <Input
                  data-testid="entry-tags-input"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  placeholder="SOP, Experiment, Protocol, Cell Culture"
                />
              </div>
              <Button type="submit" data-testid="entry-submit-btn" className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-700">
                {isEditing ? 'Update Entry' : 'Create Entry'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 dark:bg-slate-700 dark:border-slate-600"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                  <Tag className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entries List */}
      <div className="space-y-4">
        {filteredEntries.map((entry) => (
          <Card key={entry.entry_id} data-testid="notebook-entry-card" className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg font-heading dark:text-white">{entry.title}</CardTitle>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {entry.date}
                    </span>
                    {entry.author_name && (
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {entry.author_name}
                      </span>
                    )}
                    {entry.version && (
                      <span className="flex items-center">
                        <History className="h-4 w-4 mr-1" />
                        v{entry.version}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleView(entry)} title="View">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(entry)} title="Edit">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleViewHistory(entry)} title="History">
                    <History className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDuplicate(entry)} title="Duplicate">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteClick(entry)} title="Delete" className="text-rose-500 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div 
                className="text-slate-600 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none line-clamp-3"
                dangerouslySetInnerHTML={{ __html: entry.content }}
              />
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag, idx) => (
                    <span 
                      key={idx} 
                      className="inline-block px-2 py-1 text-xs font-medium bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400 rounded cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-900/50"
                      onClick={() => setSelectedTag(tag)}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <Card className="border-slate-200 dark:border-slate-700 dark:bg-slate-800">
          <CardContent className="py-12 text-center">
            <Microscope className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              {searchTerm || selectedTag !== 'all' 
                ? 'No entries match your search criteria' 
                : 'No lab notebook entries found. Create your first entry!'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* View Entry Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEntry?.title}</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {selectedEntry.date}
                </span>
                {selectedEntry.author_name && (
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {selectedEntry.author_name}
                  </span>
                )}
              </div>
              <div 
                className="prose prose-slate dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedEntry.content }}
              />
              {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-4 border-t dark:border-slate-700">
                  {selectedEntry.tags.map((tag, idx) => (
                    <span key={idx} className="inline-block px-2 py-1 text-xs font-medium bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version History: {selectedEntry?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {versionHistory.length > 0 ? (
              versionHistory.map((version, idx) => (
                <div key={idx} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium dark:text-white">Version {version.version}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{new Date(version.modified_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Modified by: {version.modified_by_name || 'Unknown'}
                  </p>
                  {version.change_summary && (
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                      Changes: {version.change_summary}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No version history available</p>
                <p className="text-sm">Version tracking starts after the first edit</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Entry"
        description={`Are you sure you want to delete "${selectedEntry?.title}"? This action cannot be undone.`}
      />
    </div>
  );
}
