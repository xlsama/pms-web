import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { eachDayOfInterval, format } from 'date-fns'

import type { ConsumeRes, UpdateConsumeReq } from '@/api/ut'
import { getConsume, getRejectUt, UtStatus, updateConsume } from '@/api/ut'
import { isWorkday } from '@/lib/ut-utils'
import type { DailyData, DayStatus, MonthStats, Project, UtAllocation } from '@/types/ut'

export const utKeys = {
  all: ['ut'] as const,
  days: () => [...utKeys.all, 'day'] as const,
  day: (date: string) => [...utKeys.all, 'day', date] as const,
  rejected: () => [...utKeys.all, 'rejected'] as const,
}

function getQueryableDates(start: Date, end: Date): Array<string> {
  const today = new Date()

  // 范围起始已超过今天，返回空
  if (start > today) return []

  // 截止到今天
  const clampedEnd = end > today ? today : end

  const allDays = eachDayOfInterval({ start, end: clampedEnd })
  return allDays.filter(d => isWorkday(format(d, 'yyyy-MM-dd'))).map(d => format(d, 'yyyy-MM-dd'))
}

function computeDayStatus(records: Array<UtAllocation>, totalUt: number): DayStatus {
  if (records.length === 0) return 'empty'
  if (records.some(r => r.status === UtStatus.Rejected)) return 'rejected'
  if (records.some(r => r.status === UtStatus.Check)) return 'check'
  if (records.every(r => r.status === UtStatus.Confirmed)) {
    return totalUt >= 1 ? 'confirmed' : 'partial'
  }
  if (totalUt >= 1) return 'complete'
  return 'partial'
}

function buildDailyData(date: string, res: ConsumeRes): DailyData {
  const records: Array<UtAllocation> = res.list
    .filter(item => item.val > 0 && item.date === date)
    .map(item => ({
      id: item.id,
      date: item.date || date,
      projectId: item.projectId,
      projectName: item.projectName,
      value: item.val,
      status: item.status,
      type: item.type,
    }))

  const totalUt = Math.round(records.reduce((sum, r) => sum + r.value, 0) * 10) / 10
  const status = computeDayStatus(records, totalUt)

  const allLocked =
    records.length > 0 &&
    records.every(r => r.status === UtStatus.Confirmed || r.status === UtStatus.Check)

  return {
    date,
    records,
    totalUt,
    status,
    editable: !(allLocked && totalUt >= 1),
    isWorkday: true,
    submitFlag: res.submitFlag,
  }
}

interface CalendarData {
  dailyMap: Map<string, DailyData>
  projects: Array<Project>
  stats: MonthStats
  isPending: boolean
  isError: boolean
}

export function useCalendarData(start: Date, end: Date): CalendarData {
  const dates = getQueryableDates(start, end)

  return useQueries({
    queries: dates.map(date => ({
      queryKey: utKeys.day(date),
      queryFn: () => getConsume({ date }),
      staleTime: 0,
      gcTime: 0,
    })),
    combine: results => {
      const dailyMap = new Map<string, DailyData>()
      const projectMap = new Map<number, Project>()
      let stats: MonthStats = {
        totalManDaysRemaining: 0,
        uncommittedDates: [],
        checkCount: 0,
        rejectedCount: 0,
      }
      let statsExtracted = false

      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const date = dates[i]

        if (!result.data) continue
        const res = result.data

        // Build daily data
        dailyMap.set(date, buildDailyData(date, res))

        // Extract projects (val=0 items are project definitions)
        for (const item of res.list) {
          if (item.projectId) {
            // 后处理的覆盖先处理的（最新 manDays）
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

        // Extract stats from any successful response (global values)
        if (!statsExtracted) {
          stats = {
            totalManDaysRemaining: res.totalManDaysRemaining,
            uncommittedDates: res.uncommittedCount,
            checkCount: res.checkCount,
            rejectedCount: res.rejectedCount,
          }
          statsExtracted = true
        }
      }

      // Deduplicate projects - keep unique by id
      const projects = Array.from(projectMap.values())

      return {
        dailyMap,
        projects,
        stats,
        isPending: results.some(r => r.isPending),
        isError: results.some(r => r.isError),
      }
    },
  })
}

export function useRejectedUt() {
  return useQuery({
    queryKey: utKeys.rejected(),
    queryFn: () => getRejectUt(),
  })
}

export function useSubmitUt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (req: UpdateConsumeReq) => updateConsume(req),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: utKeys.days() })
    },
  })
}
