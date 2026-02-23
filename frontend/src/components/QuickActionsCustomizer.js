import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { BACKEND_URL } from '@/config';
import { Clock, FileText, ClipboardList, Package, Calendar, MessageSquare, DollarSign, Microscope } from 'lucide-react';

const ALL_QUICK_ACTIONS = [
  { id: 'mark_attendance', label: 'Mark Attendance', icon: Clock, color: 'text-sky-500' },
  { id: 'request_leave', label: 'Request Leave', icon: FileText, color: 'text-emerald-500' },
  { id: 'create_ticket', label: 'Create Ticket', icon: ClipboardList, color: 'text-amber-500' },
  { id: 'request_material', label: 'Request Material', icon: Package, color: 'text-purple-500' },
  { id: 'book_equipment', label: 'Book Equipment', icon: Calendar, color: 'text-blue-500' },
  { id: 'open_chat', label: 'Open Chat', icon: MessageSquare, color: 'text-pink-500' },
  { id: 'view_payroll', label: 'View Payroll', icon: DollarSign, color: 'text-green-500' },
  { id: 'lab_notebook', label: 'Lab Notebook', icon: Microscope, color: 'text-indigo-500' },
];

export default function QuickActionsCustomizer({ open, onOpenChange, selectedActions, onSave }) {
  const [selected, setSelected] = useState(selectedActions || ['mark_attendance', 'request_leave', 'create_ticket', 'request_material']);

  useEffect(() => {
    if (selectedActions) {
      setSelected(selectedActions);
    }
  }, [selectedActions]);

  const handleToggle = (actionId) => {
    setSelected(prev => {
      if (prev.includes(actionId)) {
        return prev.filter(id => id !== actionId);
      } else {
        if (prev.length >= 4) {
          toast.error('Maximum 4 quick actions allowed');
          return prev;
        }
        return [...prev, actionId];
      }
    });
  };

  const handleSave = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/user/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quick_actions: selected })
      });
      onSave(selected);
      onOpenChange(false);
      toast.success('Quick actions updated');
    } catch (error) {
      toast.error('Failed to save preferences');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Quick Actions</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Select up to 4 quick actions to display on your dashboard.
        </p>
        <div className="space-y-3">
          {ALL_QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <div
                key={action.id}
                className="flex items-center space-x-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                onClick={() => handleToggle(action.id)}
              >
                <Checkbox
                  checked={selected.includes(action.id)}
                  onCheckedChange={() => handleToggle(action.id)}
                />
                <Icon className={`h-5 w-5 ${action.color}`} />
                <span className="text-sm font-medium text-slate-900 dark:text-white">{action.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-700">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ALL_QUICK_ACTIONS };
