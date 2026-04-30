import { useDraggable } from '@dnd-kit/core'
import { Folder, GripVertical } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Project } from '@/types/ut'

interface DraggableProjectProps {
  project: Project
}

export function DraggableProject({ project }: DraggableProjectProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `project-${project.id}`,
    data: {
      type: 'project',
      project,
    },
  })

  const isExhausted = project.manDaysRemaining <= 0

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group flex cursor-grab items-center gap-2 rounded-md border bg-background px-2 py-1.5 transition-all hover:border-primary/50 hover:bg-accent',
        isExhausted && 'border-dashed bg-muted/20 opacity-80 hover:opacity-100',
        isDragging && 'opacity-50',
      )}
      {...listeners}
      {...attributes}
    >
      <div className="relative size-4 shrink-0">
        <Folder
          className={cn(
            'absolute inset-0 size-4 transition-opacity group-hover:opacity-0',
            isExhausted ? 'text-muted-foreground' : 'text-primary',
          )}
        />
        <GripVertical className="absolute inset-0 size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-xs font-medium', isExhausted && 'text-muted-foreground')}>
          {project.name}
        </p>
        <p className={cn('text-xs', isExhausted ? 'text-muted-foreground/70' : 'text-primary')}>
          剩余 {project.manDaysRemaining} UT
        </p>
      </div>
    </div>
  )
}
