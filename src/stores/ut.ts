import { create } from 'zustand'
import type { Project } from '@/types/ut'

interface UtState {
  // Current view date (controls big calendar)
  currentDate: Date
  setCurrentDate: (date: Date) => void

  // Sidebar calendar month (independent display)
  sidebarMonth: Date
  setSidebarMonth: (date: Date) => void

  // Selected date for form
  selectedDate: string | null
  setSelectedDate: (date: string | null) => void

  // Popover/drawer state
  formOpen: boolean
  setFormOpen: (open: boolean) => void

  // Dragged project (for dnd-kit)
  draggedProject: Project | null
  setDraggedProject: (project: Project | null) => void

  // Pre-filled project from drag
  prefilledProject: Project | null
  setPrefilledProject: (project: Project | null) => void

  // All available projects
  projects: Array<Project>
  setProjects: (projects: Array<Project>) => void

  // Flash date for visual feedback
  flashDate: string | null
  setFlashDate: (date: string | null) => void
}

export const useUtStore = create<UtState>()(set => ({
  currentDate: new Date(),
  setCurrentDate: date => set({ currentDate: date }),

  sidebarMonth: new Date(),
  setSidebarMonth: date => set({ sidebarMonth: date }),

  selectedDate: null,
  setSelectedDate: selectedDate => set({ selectedDate }),

  formOpen: false,
  setFormOpen: formOpen => set({ formOpen }),

  draggedProject: null,
  setDraggedProject: draggedProject => set({ draggedProject }),

  prefilledProject: null,
  setPrefilledProject: prefilledProject => set({ prefilledProject }),

  projects: [],
  setProjects: projects => set({ projects }),

  flashDate: null,
  setFlashDate: flashDate => set({ flashDate }),
}))
