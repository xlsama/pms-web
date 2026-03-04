import { create } from 'zustand'

import type { Project } from '@/types/ut'

interface UtState {
  // Current view date (controls big calendar and sidebar calendar)
  currentDate: Date
  setCurrentDate: (date: Date) => void

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

  // Flash date for visual feedback
  flashDate: string | null
  setFlashDate: (date: string | null) => void

  // Highlight unfilled dates on calendar
  highlightUnfilled: boolean
  setHighlightUnfilled: (highlight: boolean) => void
}

export const useUtStore = create<UtState>()(set => ({
  currentDate: new Date(),
  setCurrentDate: date => set({ currentDate: date, highlightUnfilled: false }),

  selectedDate: null,
  setSelectedDate: selectedDate => set({ selectedDate }),

  formOpen: false,
  setFormOpen: formOpen => set({ formOpen }),

  draggedProject: null,
  setDraggedProject: draggedProject => set({ draggedProject }),

  prefilledProject: null,
  setPrefilledProject: prefilledProject => set({ prefilledProject }),

  flashDate: null,
  setFlashDate: flashDate => set({ flashDate }),

  highlightUnfilled: false,
  setHighlightUnfilled: highlightUnfilled => set({ highlightUnfilled }),
}))
