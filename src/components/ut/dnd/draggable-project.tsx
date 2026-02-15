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

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group flex cursor-grab items-center gap-2 rounded-md border bg-background px-2 py-1.5 transition-all hover:border-primary/50 hover:bg-accent',
        isDragging && 'opacity-50',
      )}
      {...listeners}
      {...attributes}
    >
      <div className="relative size-4 shrink-0">
        <Folder className="absolute inset-0 size-4 text-primary transition-opacity group-hover:opacity-0" />
        <GripVertical className="absolute inset-0 size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{project.name}</p>
        <p className="text-xs text-muted-foreground">剩余 {project.manDaysRemaining} UT</p>
      </div>
    </div>
  )
}
