import { useQueries } from '@tanstack/react-query'
import { eachDayOfInterval, format } from 'date-fns'

import { getConsume, type UtStatus } from '@/api/ut'
import { isWorkday } from '@/lib/ut-utils'

import { utKeys } from './use-ut'

export interface ProjectSearchEntry {
  date: string
  val: number
  status: UtStatus
}

export interface ProjectSearchItem {
  id: number
  name: string
  code: string
  totalUt: number
  days: Array<ProjectSearchEntry>
}

export interface ProjectSearchData {
  year: number
  projects: Array<ProjectSearchItem>
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

export function useYearlyProjectIndex(enabled: boolean): ProjectSearchData {
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
      const projectMap = new Map<number, ProjectSearchItem>()

      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const date = dates[i]
        if (!result.data) continue

        for (const item of result.data.list) {
          if (item.val <= 0 || !item.projectId) continue

          let project = projectMap.get(item.projectId)
          if (!project) {
            project = {
              id: item.projectId,
              name: item.projectName,
              code: item.projectCode || '',
              totalUt: 0,
              days: [],
            }
            projectMap.set(item.projectId, project)
          }
          project.totalUt = round1(project.totalUt + item.val)
          project.days.push({ date, val: item.val, status: item.status })
        }
      }

      for (const project of projectMap.values()) {
        project.days.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      }
      const projects = Array.from(projectMap.values()).sort((a, b) => b.totalUt - a.totalUt)

      return {
        year,
        projects,
        isPending: enabled && results.some(r => r.isPending),
        isError: results.some(r => r.isError),
      }
    },
  })
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
