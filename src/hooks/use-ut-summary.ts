import { useQueries } from '@tanstack/react-query'
import { format } from 'date-fns'

import { getConsume } from '@/api/ut'
import { getWorkdaysInRange, isLeaveProject } from '@/lib/ut-utils'
import { UtStatus } from '@/types/ut'

import { utKeys } from './use-ut'

export interface UtSummaryProject {
  projectId: number
  projectName: string
  totalUt: number
  monthly: Array<{ monthKey: string; ut: number }>
}

export interface UtSummaryData {
  range: { start: string; end: string }
  projects: Array<UtSummaryProject>
  totalUt: number
  isPending: boolean
  isError: boolean
}

export function useUtSummary(params: { start: Date; end: Date; enabled: boolean }): UtSummaryData {
  const { start, end, enabled } = params
  const dates = enabled ? getWorkdaysInRange(start, end) : []
  const startStr = format(start, 'yyyy-MM-dd')
  const endStr = format(end, 'yyyy-MM-dd')

  return useQueries({
    queries: dates.map(date => ({
      queryKey: utKeys.day(date),
      queryFn: () => getConsume({ date }),
      enabled,
      staleTime: 5 * 60 * 1000,
    })),
    combine: results => {
      const projectMap = new Map<
        number,
        { projectName: string; totalUt: number; monthly: Map<string, number> }
      >()

      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const date = dates[i]
        if (!result.data) continue

        const monthKey = date.slice(0, 7)
        for (const item of result.data.list) {
          if (
            item.val <= 0 ||
            item.status !== UtStatus.Confirmed ||
            !item.projectId ||
            isLeaveProject(item.projectName)
          ) {
            continue
          }
          const existing = projectMap.get(item.projectId)
          if (existing) {
            existing.totalUt += item.val
            existing.monthly.set(monthKey, (existing.monthly.get(monthKey) ?? 0) + item.val)
          } else {
            projectMap.set(item.projectId, {
              projectName: item.projectName,
              totalUt: item.val,
              monthly: new Map([[monthKey, item.val]]),
            })
          }
        }
      }

      const projects: Array<UtSummaryProject> = Array.from(projectMap.entries())
        .map(([projectId, info]) => ({
          projectId,
          projectName: info.projectName,
          totalUt: round1(info.totalUt),
          monthly: Array.from(info.monthly.entries())
            .map(([monthKey, ut]) => ({ monthKey, ut: round1(ut) }))
            .sort((a, b) => a.monthKey.localeCompare(b.monthKey)),
        }))
        .sort((a, b) => b.totalUt - a.totalUt)

      const totalUt = round1(projects.reduce((sum, p) => sum + p.totalUt, 0))

      return {
        range: { start: startStr, end: endStr },
        projects,
        totalUt,
        isPending: enabled && results.some(r => r.isPending),
        isError: results.some(r => r.isError),
      }
    },
  })
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
