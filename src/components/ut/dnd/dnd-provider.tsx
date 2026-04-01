import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import type { ReactNode } from 'react'

import { isFutureDate } from '@/lib/ut-utils'
import { useUtStore } from '@/stores/ut'
import type { Project } from '@/types/ut'

import { DragOverlayContent } from './drag-overlay'

interface DndProviderProps {
  children: ReactNode
  onDrop?: (project: Project, date: string) => void
}

export function UtDndProvider({ children, onDrop }: DndProviderProps) {
  const { draggedProject, setDraggedProject } = useUtStore()

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  })

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  })

  const sensors = useSensors(mouseSensor, touchSensor)

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    if (active.data.current?.type === 'project') {
      setDraggedProject(active.data.current.project as Project)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (
      over &&
      active.data.current?.type === 'project' &&
      over.data.current?.type === 'calendar-day'
    ) {
      const project = active.data.current.project as Project
      const date = over.data.current.date as string
      if (isFutureDate(date)) return
      onDrop?.(project, date)
    }

    setDraggedProject(null)
  }

  const handleDragCancel = () => {
    setDraggedProject(null)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {draggedProject && <DragOverlayContent project={draggedProject} />}
      </DragOverlay>
    </DndContext>
  )
}
