import type { UtItem, UtStatus } from '@/api/ut'

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
  type?: string
}

// Daily data for calendar display (replaces DailyUtSummary)
export interface DailyData {
  date: string // "yyyy-MM-dd"
  records: Array<UtAllocation> // val > 0 的 UT 记录
  totalUt: number
  status: DayStatus
  editable: boolean
  isWorkday: boolean
  submitFlag: boolean
}

export type DayStatus = 'empty' | 'partial' | 'complete' | 'confirmed' | 'check' | 'rejected'

export interface MonthStats {
  totalManDaysRemaining: number
  uncommittedDates: Array<{ workDate: string; workHours: number }>
  checkCount: number
  rejectedCount: number
}

// Form data for submitting UT
export interface UtFormData {
  date: string
  allocations: Array<{
    projectId: number
    projectName: string
    value: number
    utType: number
  }>
}

// Drag data for dnd-kit
export interface DragProjectData {
  type: 'project'
  project: Project
}
