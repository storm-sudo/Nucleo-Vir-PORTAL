import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, Clock, AlertCircle, User } from 'lucide-react';

function SortableTask({ task, onDelete, isAdmin, getPriorityColor, isOverdue, onStatusChange, columns }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.task_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const overdue = isOverdue(task.due_date) && task.status !== 'Completed';

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className={`border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow duration-300 cursor-move ${overdue ? 'border-l-4 border-l-rose-500' : ''} dark:bg-slate-800`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2 flex-1">
              <div {...listeners} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="h-4 w-4 text-slate-400 mt-1" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base font-heading mb-2 dark:text-white">{task.title}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  {overdue && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
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
                onClick={() => onDelete(task)}
                className="h-8 w-8 p-0 ml-2"
              >
                <Trash2 className="h-4 w-4 text-rose-600" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">{task.description}</p>
          {task.assigned_to_name && (
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
              <User className="h-3 w-3 mr-1" />
              {task.assigned_to_name}
            </div>
          )}
          <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
            <Clock className="h-3 w-3 mr-1" />
            Due: {new Date(task.due_date).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function KanbanBoard({ tasks, columns, onTaskMove, onDeleteTask, isAdmin, onStatusChange }) {
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800';
      case 'Medium':
        return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
      case 'Low':
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const task = tasks.find(t => t.task_id === active.id);
    setActiveTask(task);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTask = tasks.find(t => t.task_id === active.id);
    const overId = over.id;

    // Check if dropped on a column
    const targetColumn = columns.find(col => col.id === overId || col.name === overId);
    if (targetColumn && activeTask.status !== targetColumn.name) {
      onTaskMove(activeTask.task_id, targetColumn.name);
      return;
    }

    // Check if dropped on another task
    const overTask = tasks.find(t => t.task_id === overId);
    if (overTask && activeTask.status !== overTask.status) {
      onTaskMove(activeTask.task_id, overTask.status);
    }
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find(t => t.task_id === active.id);
    const overId = over.id;

    // Check if hovering over a column
    const targetColumn = columns.find(col => col.id === overId || col.name === overId);
    if (targetColumn && activeTask && activeTask.status !== targetColumn.name) {
      // Visual feedback handled by CSS
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(280px, 1fr))` }}>
        {columns.map((column) => {
          const columnTasks = tasks.filter(t => t.status === column.name);
          return (
            <div key={column.id} className="space-y-4" id={column.id}>
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                <h3 className="font-heading font-semibold text-slate-900 dark:text-white">{column.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {columnTasks.length} tasks
                </p>
              </div>
              <SortableContext items={columnTasks.map(t => t.task_id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 min-h-[400px]" data-column={column.name}>
                  {columnTasks.map((task) => (
                    <SortableTask
                      key={task.task_id}
                      task={task}
                      onDelete={onDeleteTask}
                      isAdmin={isAdmin}
                      getPriorityColor={getPriorityColor}
                      isOverdue={isOverdue}
                      onStatusChange={onStatusChange}
                      columns={columns}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <Card className="border-slate-200 dark:border-slate-700 shadow-xl rotate-3 dark:bg-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading dark:text-white">{activeTask.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-300">{activeTask.description}</p>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
