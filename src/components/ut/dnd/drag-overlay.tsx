import { Folder } from 'lucide-react'
import type { Project } from '@/types/ut'

interface DragOverlayContentProps {
  project: Project
}

export function DragOverlayContent({ project }: DragOverlayContentProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 shadow-lg">
      <Folder className="size-4 text-primary" />
      <span className="text-sm font-medium">{project.name}</span>
    </div>
  )
}
