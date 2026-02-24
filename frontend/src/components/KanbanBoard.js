import React, { useState } from 'react';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, Clock, AlertCircle, User } from 'lucide-react';

function SortableTask({ task, onDelete, isAdmin, getPriorityColor, isOverdue }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.task_id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const overdue = isOverdue(task.due_date) && task.status !== 'Completed';

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className={`bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 hover:shadow-md transition-all duration-300 cursor-move ${overdue ? 'border-l-4 border-l-red-500' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2 flex-1">
              <div {...listeners} className="cursor-grab active:cursor-grabbing"><GripVertical className="h-4 w-4 text-gray-400 dark:text-slate-500 mt-1" /></div>
              <div className="flex-1">
                <CardTitle className="text-base font-heading mb-2 text-gray-900 dark:text-white">{task.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                  {overdue && (<span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"><AlertCircle className="h-3 w-3 mr-1" />Overdue</span>)}
                </div>
              </div>
            </div>
            {isAdmin && (<Button size="sm" variant="ghost" onClick={() => onDelete(task)} className="h-8 w-8 p-0 ml-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></Button>)}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-slate-400">{task.description}</p>
          {task.assigned_to_name && (<div className="flex items-center text-xs text-gray-500 dark:text-slate-500"><User className="h-3 w-3 mr-1" />{task.assigned_to_name}</div>)}
          <div className="flex items-center text-xs text-gray-500 dark:text-slate-500"><Clock className="h-3 w-3 mr-1" />Due: {new Date(task.due_date).toLocaleDateString()}</div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function KanbanBoard({ tasks, columns, onTaskMove, onDeleteTask, isAdmin }) {
  const [activeTask, setActiveTask] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30';
      case 'Medium': return 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30';
      default: return 'bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-500';
    }
  };

  const isOverdue = (dueDate) => dueDate && new Date(dueDate) < new Date();
  const handleDragStart = (event) => { setActiveTask(tasks.find(t => t.task_id === event.active.id)); };
  const handleDragEnd = (event) => {
    const { active, over } = event; setActiveTask(null); if (!over) return;
    const activeTask = tasks.find(t => t.task_id === active.id);
    const targetColumn = columns.find(col => col.id === over.id || col.name === over.id);
    if (targetColumn && activeTask.status !== targetColumn.name) { onTaskMove(activeTask.task_id, targetColumn.name); return; }
    const overTask = tasks.find(t => t.task_id === over.id);
    if (overTask && activeTask.status !== overTask.status) { onTaskMove(activeTask.task_id, overTask.status); }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(280px, 1fr))` }}>
        {columns.map((column) => {
          const columnTasks = tasks.filter(t => t.status === column.name);
          return (
            <div key={column.id} className="space-y-4" id={column.id}>
              <div className="bg-gray-100 dark:bg-slate-700 p-3 rounded-xl border border-gray-200 dark:border-slate-600">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-white">{column.name}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">{columnTasks.length} tasks</p>
              </div>
              <SortableContext items={columnTasks.map(t => t.task_id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 min-h-[400px]" data-column={column.name}>
                  {columnTasks.map((task) => (<SortableTask key={task.task_id} task={task} onDelete={onDeleteTask} isAdmin={isAdmin} getPriorityColor={getPriorityColor} isOverdue={isOverdue} />))}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
      <DragOverlay>
        {activeTask && (
          <Card className="bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 shadow-2xl rotate-3">
            <CardHeader className="pb-3"><CardTitle className="text-base font-heading text-gray-900 dark:text-white">{activeTask.title}</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-gray-600 dark:text-slate-400">{activeTask.description}</p></CardContent>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
