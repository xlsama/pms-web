import { isWeekend } from 'date-fns'
import type { DailyUtSummary, Project, UtAllocation, UtItem } from '@/types/ut'
import { UtStatus } from '@/types/ut'

/**
 * Build daily summaries map from UT list data
 */
export function buildDailySummaries(list: Array<UtItem> | undefined): Map<string, DailyUtSummary> {
  const map = new Map<string, DailyUtSummary>()

  if (!list) return map

  // Group by date
  const byDate = new Map<string, Array<UtAllocation>>()

  for (const item of list) {
    if (item.date) {
      const existing = byDate.get(item.date) || []
      existing.push({
        id: item.id,
        date: item.date,
        projectId: item.projectId,
        projectName: item.projectName,
        value: item.val,
        status: item.status,
      })
      byDate.set(item.date, existing)
    }
  }

  for (const [date, allocations] of byDate) {
    const totalUt = allocations.reduce((sum, a) => sum + a.value, 0)
    const status = allocations[0]?.status || UtStatus.None
    const editable = status !== UtStatus.Confirmed

    map.set(date, {
      date,
      isWorkday: !isWeekend(new Date(date)),
      allocations,
      totalUt,
      status,
      editable,
    })
  }

  return map
}

/**
 * Extract unique projects from UT list data
 */
export function extractProjects(list: Array<UtItem> | undefined): Array<Project> {
  if (!list) return []

  const projectMap = new Map<number, Project>()

  for (const item of list) {
    if (item.projectId && !projectMap.has(item.projectId)) {
      projectMap.set(item.projectId, {
        id: item.projectId,
        name: item.projectName,
        code: item.projectCode || '',
        manDaysRemaining: item.manDaysRemaining,
        manDaysUsed: item.manDaysUsed,
        totalManDays: item.totalManDays,
      })
    }
  }

  return Array.from(projectMap.values())
}

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
