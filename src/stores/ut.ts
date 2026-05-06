import { format, isSameMonth, parseISO } from 'date-fns'
import { create } from 'zustand'

import type { Project } from '@/types/ut'

interface UtState {
  // Current view date (controls big calendar and sidebar calendar)
  currentDate: Date
  setCurrentDate: (date: Date) => void

  // Focused date — user's current focus (drives sidebar selected ring + main calendar persistent focus ring)
  focusedDate: string
  setFocusedDate: (date: string) => void

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

  // Flash date for visual feedback (nonce forces overlay remount on repeated triggers)
  flashDate: string | null
  flashNonce: number
  setFlashDate: (date: string | null) => void

  // Highlight unfilled dates on calendar
  highlightUnfilled: boolean
  setHighlightUnfilled: (highlight: boolean) => void
}

export const useUtStore = create<UtState>()(set => ({
  currentDate: new Date(),
  setCurrentDate: date => set({ currentDate: date, highlightUnfilled: false }),

  focusedDate: format(new Date(), 'yyyy-MM-dd'),
  setFocusedDate: focusedDate =>
    set(state => {
      const focused = parseISO(focusedDate)
      return {
        focusedDate,
        currentDate: isSameMonth(focused, state.currentDate) ? state.currentDate : focused,
        highlightUnfilled: false,
      }
    }),

  selectedDate: null,
  setSelectedDate: selectedDate => set({ selectedDate }),

  formOpen: false,
  setFormOpen: formOpen => set({ formOpen }),

  draggedProject: null,
  setDraggedProject: draggedProject => set({ draggedProject }),

  prefilledProject: null,
  setPrefilledProject: prefilledProject => set({ prefilledProject }),

  flashDate: null,
  flashNonce: 0,
  setFlashDate: flashDate => set(state => ({ flashDate, flashNonce: state.flashNonce + 1 })),

  highlightUnfilled: false,
  setHighlightUnfilled: highlightUnfilled => set({ highlightUnfilled }),
}))
