import type { UtStatus, UtItem } from '@/api/ut'

// Re-export for convenience
export { UtStatus } from '@/api/ut'
export type { UtItem }

// Project interface for sidebar
export interface Project {
  id: number
  name: string
  code: string
  manDaysRemaining: number
  manDaysUsed: number
  totalManDays: number
}

// UT allocation for a single day
export interface UtAllocation {
  id?: number
  date: string // yyyy-MM-dd
  projectId: number
  projectName: string
  value: number // 0.25 / 0.5 / 0.75 / 1
  status: UtStatus
  utType?: number
}

// Daily summary for calendar display
export interface DailyUtSummary {
  date: string // yyyy-MM-dd
  isWorkday: boolean
  allocations: UtAllocation[]
  totalUt: number
  status: UtStatus
  editable: boolean
}

// Monthly data response
export interface MonthlyUtData {
  year: number
  month: number
  days: DailyUtSummary[]
  projects: Project[]
  stats: {
    totalManDaysRemaining: number
    uncommittedCount: number
    checkCount: number
    rejectedCount: number
  }
}

// Weekly data response
export interface WeeklyUtData {
  weekIndex: number
  startDate: string
  endDate: string
  days: DailyUtSummary[]
  projects: Project[]
}

// Form data for submitting UT
export interface UtFormData {
  date: string
  allocations: {
    projectId: number
    projectName: string
    value: number
    utType: number
  }[]
}

// Drag data for dnd-kit
export interface DragProjectData {
  type: 'project'
  project: Project
}
