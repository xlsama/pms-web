import { useQueries } from '@tanstack/react-query'
import {
  differenceInCalendarMonths,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'

import { getConsume, UtStatus } from '@/api/ut'
import { getWorkdaysInRange, isLeaveProject, parseEntryDate } from '@/lib/ut-utils'
import { useAuthStore } from '@/stores/auth'

import { utKeys } from './use-ut'

const TOP_N = 5
const OTHERS_KEY = 'others'
const OTHERS_LABEL = '其他'

const PROJECT_COLORS = [
  'var(--color-chart-5)',
  'var(--color-chart-4)',
  'var(--color-chart-3)',
  'var(--color-chart-2)',
  'var(--color-chart-1)',
] as const

const OTHERS_COLOR = 'var(--color-muted-foreground)'

export type UtRange = 'year' | 'month' | 'all'
export type UtBucketGranularity = 'week' | 'month' | 'year'

export interface YearlyProject {
  key: string
  name: string
  totalUt: number
  color: string
}

export interface YearlyBucketRow {
  bucketKey: string
  bucketLabel: string
  [projectKey: string]: number | string
}

export interface YearlyTopProject {
  name: string
  totalUt: number
  percent: number
}

export interface YearlyStats {
  totalUt: number
  projectCount: number
  topProject: { name: string; totalUt: number } | null
  top3: Array<YearlyTopProject>
}

export interface YearlyUtData {
  range: UtRange
  granularity: UtBucketGranularity
  start: Date
  end: Date
  bucketRows: Array<YearlyBucketRow>
  projects: Array<YearlyProject>
  stats: YearlyStats
  isPending: boolean
  isError: boolean
  entryDateMissing: boolean
}

interface RangeSpec {
  start: Date
  end: Date
  granularity: UtBucketGranularity
  entryDateMissing: boolean
}

function resolveRangeSpec(range: UtRange, entryDate: Date | null): RangeSpec {
  const today = new Date()
  if (range === 'month') {
    return { start: startOfMonth(today), end: today, granularity: 'week', entryDateMissing: false }
  }
  if (range === 'all') {
    if (!entryDate) {
      return {
        start: startOfYear(today),
        end: today,
        granularity: 'month',
        entryDateMissing: true,
      }
    }
    const months = differenceInCalendarMonths(today, entryDate)
    const granularity: UtBucketGranularity = months > 18 ? 'year' : 'month'
    return { start: entryDate, end: today, granularity, entryDateMissing: false }
  }
  return { start: startOfYear(today), end: today, granularity: 'month', entryDateMissing: false }
}

function buildBucketsForSpec(spec: RangeSpec): {
  rows: Array<YearlyBucketRow>
  resolveKey: (date: string) => string | null
} {
  const { start, end, granularity } = spec

  if (granularity === 'year') {
    const startYear = start.getFullYear()
    const endYear = end.getFullYear()
    const rows: Array<YearlyBucketRow> = []
    for (let y = startYear; y <= endYear; y++) {
      rows.push({ bucketKey: String(y), bucketLabel: String(y) })
    }
    return { rows, resolveKey: date => date.slice(0, 4) }
  }

  if (granularity === 'month') {
    const rows: Array<YearlyBucketRow> = []
    const cursor = startOfMonth(start)
    const last = startOfMonth(end)
    const sameYearAll = start.getFullYear() === end.getFullYear()
    while (cursor <= last) {
      const key = format(cursor, 'yyyy-MM')
      const label = sameYearAll ? `${cursor.getMonth() + 1}月` : key
      rows.push({ bucketKey: key, bucketLabel: label })
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return { rows, resolveKey: date => date.slice(0, 7) }
  }

  // week granularity（通常用于 'month' range）：以周一为周 key，按出现顺序编号 W1..Wn
  const rows: Array<YearlyBucketRow> = []
  const keyByDate = new Map<string, string>()
  const seen = new Set<string>()
  const cursor = new Date(start)
  cursor.setHours(0, 0, 0, 0)
  let weekIndex = 0
  while (cursor <= end) {
    const dateStr = format(cursor, 'yyyy-MM-dd')
    const monday = startOfWeek(cursor, { weekStartsOn: 1 })
    const key = format(monday, 'yyyy-MM-dd')
    if (!seen.has(key)) {
      seen.add(key)
      weekIndex += 1
      rows.push({ bucketKey: key, bucketLabel: `W${weekIndex}` })
    }
    keyByDate.set(dateStr, key)
    cursor.setDate(cursor.getDate() + 1)
  }
  return { rows, resolveKey: date => keyByDate.get(date) ?? null }
}

export function useYearlyUtData(enabled: boolean, range: UtRange = 'year'): YearlyUtData {
  const user = useAuthStore(state => state.user)
  const entryDate = parseEntryDate(user?.entryTime)
  const spec = resolveRangeSpec(range, entryDate)
  const dates = enabled ? getWorkdaysInRange(spec.start, spec.end) : []
  const { rows: emptyBuckets, resolveKey } = buildBucketsForSpec(spec)

  return useQueries({
    queries: dates.map(date => ({
      queryKey: utKeys.day(date),
      queryFn: () => getConsume({ date }),
      enabled,
      staleTime: 5 * 60 * 1000,
    })),
    combine: results => {
      const projectTotals = new Map<number, { name: string; total: number }>()
      const bucketProjectMap = new Map<string, Map<number, number>>()

      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const date = dates[i]
        if (!result.data) continue

        for (const item of result.data.list) {
          if (
            item.val <= 0 ||
            item.status !== UtStatus.Confirmed ||
            !item.projectId ||
            isLeaveProject(item.projectName)
          ) {
            continue
          }
          const bucketKey = resolveKey(date)
          if (!bucketKey) continue

          const existing = projectTotals.get(item.projectId)
          if (existing) existing.total += item.val
          else projectTotals.set(item.projectId, { name: item.projectName, total: item.val })

          let bucketMap = bucketProjectMap.get(bucketKey)
          if (!bucketMap) {
            bucketMap = new Map()
            bucketProjectMap.set(bucketKey, bucketMap)
          }
          bucketMap.set(item.projectId, (bucketMap.get(item.projectId) ?? 0) + item.val)
        }
      }

      const sortedProjects = Array.from(projectTotals.entries()).sort(
        ([, a], [, b]) => b.total - a.total,
      )
      const topProjects = sortedProjects.slice(0, TOP_N)
      const restProjects = sortedProjects.slice(TOP_N)

      const projects: Array<YearlyProject> = topProjects.map(([id, info], idx) => ({
        key: `p_${id}`,
        name: info.name,
        totalUt: round1(info.total),
        color: PROJECT_COLORS[idx],
      }))

      if (restProjects.length > 0) {
        const othersTotal = restProjects.reduce((sum, [, info]) => sum + info.total, 0)
        projects.push({
          key: OTHERS_KEY,
          name: `${OTHERS_LABEL}（${restProjects.length}）`,
          totalUt: round1(othersTotal),
          color: OTHERS_COLOR,
        })
      }

      const restProjectIds = new Set(restProjects.map(([id]) => id))
      const bucketRows = emptyBuckets.map(row => ({ ...row }))
      for (const row of bucketRows) {
        const bucketMap = bucketProjectMap.get(row.bucketKey as string)
        for (const project of projects) {
          row[project.key] = 0
        }
        if (!bucketMap) continue
        for (const [projectId, val] of bucketMap) {
          if (restProjectIds.has(projectId)) {
            row[OTHERS_KEY] = round1((row[OTHERS_KEY] as number) + val)
          } else {
            const key = `p_${projectId}`
            if (key in row) row[key] = round1((row[key] as number) + val)
          }
        }
      }

      const totalUt = round1(
        Array.from(projectTotals.values()).reduce((sum, p) => sum + p.total, 0),
      )

      const namedProjects = projects.filter(p => p.key !== OTHERS_KEY)
      const top3: Array<YearlyTopProject> = namedProjects.slice(0, 3).map(p => ({
        name: p.name,
        totalUt: p.totalUt,
        percent: totalUt > 0 ? Math.round((p.totalUt / totalUt) * 100) : 0,
      }))

      const topProject = namedProjects[0]
        ? { name: namedProjects[0].name, totalUt: namedProjects[0].totalUt }
        : null

      return {
        range,
        granularity: spec.granularity,
        start: spec.start,
        end: spec.end,
        bucketRows,
        projects,
        stats: {
          totalUt,
          projectCount: projectTotals.size,
          topProject,
          top3,
        },
        isPending: enabled && results.some(r => r.isPending),
        isError: results.some(r => r.isError),
        entryDateMissing: spec.entryDateMissing,
      }
    },
  })
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
