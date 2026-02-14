import { isWorkday as isChineseWorkday } from 'chinese-days'
import { isWeekend } from 'date-fns'

import { UtStatus } from '@/types/ut'
import type { DayStatus } from '@/types/ut'

/**
 * Get status color class for UT allocation badge
 */
export function getStatusColorClass(status: UtStatus): string {
  switch (status) {
    case UtStatus.Confirmed:
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
    case UtStatus.Check:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
    case UtStatus.Rejected:
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

/**
 * Check if a project is a leave project (无薪假 or 带薪假)
 */
export function isLeaveProject(name: string): boolean {
  return name.startsWith('【无薪假】') || name.startsWith('【带薪假】')
}

/** 判断是否为工作日（含调休） */
export function isWorkday(date: string): boolean {
  return isChineseWorkday(date)
}

/** 调休类型：'work' = 调休上班（周末）, 'rest' = 周末或节假日休息, null = 普通工作日 */
export function getAdjustmentType(date: string): 'work' | 'rest' | null {
  const workday = isChineseWorkday(date)
  const weekend = isWeekend(new Date(date))
  if (workday && weekend) return 'work'
  if (!workday || weekend) return 'rest'
  return null
}

/**
 * Get background color class for calendar cell based on DayStatus
 */
export function getDayStatusColorClass(status: DayStatus): string {
  switch (status) {
    case 'confirmed':
      return 'bg-green-50 dark:bg-green-950/30'
    case 'complete':
      return 'bg-blue-50 dark:bg-blue-950/30'
    case 'check':
      return 'bg-yellow-50 dark:bg-yellow-950/30'
    case 'rejected':
      return 'bg-red-50 dark:bg-red-950/30'
    case 'partial':
      return 'bg-orange-50 dark:bg-orange-950/30'
    case 'empty':
    default:
      return ''
  }
}
