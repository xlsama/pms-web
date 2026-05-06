import { useQueries } from '@tanstack/react-query'
import { eachDayOfInterval, format, getMonth } from 'date-fns'

import { getConsume, UtStatus } from '@/api/ut'
import { isLeaveProject, isWorkday } from '@/lib/ut-utils'

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

export interface YearlyProject {
  key: string
  name: string
  totalUt: number
  color: string
}

export interface YearlyMonthRow {
  monthKey: string
  monthLabel: string
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
  busiestMonth: string
  topProject: { name: string; totalUt: number } | null
  top3: Array<YearlyTopProject>
}

export interface YearlyUtData {
  year: number
  monthlyData: Array<YearlyMonthRow>
  projects: Array<YearlyProject>
  stats: YearlyStats
  isPending: boolean
  isError: boolean
}

function getYearWorkdays(year: number): Array<string> {
  const today = new Date()
  const start = new Date(year, 0, 1)
  const end = today.getFullYear() === year ? today : new Date(year, 11, 31)
  if (start > end) return []
  return eachDayOfInterval({ start, end })
    .map(d => format(d, 'yyyy-MM-dd'))
    .filter(isWorkday)
}

function buildEmptyMonthlyData(year: number): Array<YearlyMonthRow> {
  const today = new Date()
  const lastMonth = today.getFullYear() === year ? getMonth(today) : 11
  const rows: Array<YearlyMonthRow> = []
  for (let m = 0; m <= lastMonth; m++) {
    rows.push({ monthKey: `${year}-${String(m + 1).padStart(2, '0')}`, monthLabel: `${m + 1}月` })
  }
  return rows
}

export function useYearlyUtData(enabled: boolean): YearlyUtData {
  const year = new Date().getFullYear()
  const dates = getYearWorkdays(year)

  return useQueries({
    queries: dates.map(date => ({
      queryKey: utKeys.day(date),
      queryFn: () => getConsume({ date }),
      enabled,
      staleTime: 5 * 60 * 1000,
    })),
    combine: results => {
      const monthlyData = buildEmptyMonthlyData(year)
      const projectTotals = new Map<number, { name: string; total: number }>()
      const monthlyProjectMap = new Map<string, Map<number, number>>()

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
          const monthIdx = Number(date.slice(5, 7)) - 1
          const monthKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}`

          const existing = projectTotals.get(item.projectId)
          if (existing) existing.total += item.val
          else projectTotals.set(item.projectId, { name: item.projectName, total: item.val })

          let monthMap = monthlyProjectMap.get(monthKey)
          if (!monthMap) {
            monthMap = new Map()
            monthlyProjectMap.set(monthKey, monthMap)
          }
          monthMap.set(item.projectId, (monthMap.get(item.projectId) ?? 0) + item.val)
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
      for (const row of monthlyData) {
        const monthMap = monthlyProjectMap.get(row.monthKey)
        for (const project of projects) {
          row[project.key] = 0
        }
        if (!monthMap) continue
        for (const [projectId, val] of monthMap) {
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

      let busiestMonth = ''
      let busiestSum = -1
      for (const row of monthlyData) {
        const sum = projects.reduce((s, p) => s + (row[p.key] as number), 0)
        if (sum > busiestSum) {
          busiestSum = sum
          busiestMonth = row.monthLabel
        }
      }

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
        year,
        monthlyData,
        projects,
        stats: {
          totalUt,
          projectCount: projectTotals.size,
          busiestMonth: busiestSum > 0 ? busiestMonth : '-',
          topProject,
          top3,
        },
        isPending: enabled && results.some(r => r.isPending),
        isError: results.some(r => r.isError),
      }
    },
  })
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
