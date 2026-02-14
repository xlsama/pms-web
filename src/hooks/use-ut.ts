import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ConsumeRes, UpdateConsumeReq, UtItem } from '@/api/ut'
import { UtStatus } from '@/api/ut'

export const utKeys = {
  all: ['ut'] as const,
  monthly: (year: number, month: number) => [...utKeys.all, 'monthly', year, month] as const,
  weekly: (weekIndex: number) => [...utKeys.all, 'weekly', weekIndex] as const,
  projects: () => [...utKeys.all, 'projects'] as const,
  rejected: () => [...utKeys.all, 'rejected'] as const,
}

// Mock projects data
const mockProjects: Array<UtItem> = [
  {
    id: 1,
    userId: 1,
    userName: '张三',
    userCode: 'zhangsan',
    userType: 'dev',
    type: '1',
    projectId: 101,
    projectCode: 'PROJ-001',
    projectName: 'AIGC Chatbot',
    val: 0,
    levelCoefficient: 1,
    standardVal: 1,
    status: UtStatus.None,
    userStatus: 'active',
    date: null,
    dates: null,
    cost: 0,
    deleted: false,
    createTime: null,
    createTimes: null,
    createTimeFull: null,
    createTimeFulls: null,
    createBy: null,
    modifyTime: null,
    modifyTimes: null,
    modifyBy: null,
    weekIndex: null,
    utType: '1',
    utTypes: null,
    workOvertime: 0,
    hasChildren: false,
    children: null,
    totalManDays: 30,
    manDaysUsed: 12,
    manDaysRemaining: 18,
    stage: 'development',
    workOvertimeStatus: null,
  },
  {
    id: 2,
    userId: 1,
    userName: '张三',
    userCode: 'zhangsan',
    userType: 'dev',
    type: '1',
    projectId: 102,
    projectCode: 'PROJ-002',
    projectName: 'Starbucks BTS',
    val: 0,
    levelCoefficient: 1,
    standardVal: 1,
    status: UtStatus.None,
    userStatus: 'active',
    date: null,
    dates: null,
    cost: 0,
    deleted: false,
    createTime: null,
    createTimes: null,
    createTimeFull: null,
    createTimeFulls: null,
    createBy: null,
    modifyTime: null,
    modifyTimes: null,
    modifyBy: null,
    weekIndex: null,
    utType: '1',
    utTypes: null,
    workOvertime: 0,
    hasChildren: false,
    children: null,
    totalManDays: 50,
    manDaysUsed: 25,
    manDaysRemaining: 25,
    stage: 'development',
    workOvertimeStatus: null,
  },
  {
    id: 3,
    userId: 1,
    userName: '张三',
    userCode: 'zhangsan',
    userType: 'dev',
    type: '1',
    projectId: 103,
    projectCode: 'PROJ-003',
    projectName: '内部管理系统',
    val: 0,
    levelCoefficient: 1,
    standardVal: 1,
    status: UtStatus.None,
    userStatus: 'active',
    date: null,
    dates: null,
    cost: 0,
    deleted: false,
    createTime: null,
    createTimes: null,
    createTimeFull: null,
    createTimeFulls: null,
    createBy: null,
    modifyTime: null,
    modifyTimes: null,
    modifyBy: null,
    weekIndex: null,
    utType: '1',
    utTypes: null,
    workOvertime: 0,
    hasChildren: false,
    children: null,
    totalManDays: 20,
    manDaysUsed: 5,
    manDaysRemaining: 15,
    stage: 'maintenance',
    workOvertimeStatus: null,
  },
]

// Generate mock UT records for a month
function generateMockUtRecords(year: number, month: number): Array<UtItem> {
  const records: Array<UtItem> = []
  const daysInMonth = new Date(year, month, 0).getDate()

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayOfWeek = new Date(year, month - 1, day).getDay()

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) continue

    // Generate some mock records for past days
    const today = new Date()
    const currentDate = new Date(year, month - 1, day)

    if (currentDate < today) {
      // Past days have submitted records
      const projectIndex = day % 3
      const project = mockProjects[projectIndex]
      const status =
        day % 5 === 0 ? UtStatus.Rejected : day % 3 === 0 ? UtStatus.Check : UtStatus.Confirmed

      records.push({
        ...project,
        id: day * 100 + 1,
        date,
        val: 1,
        status,
      })
    }
  }

  return records
}

// Mock API response
function getMockConsumeRes(year: number, month: number): ConsumeRes {
  const records = generateMockUtRecords(year, month)
  const today = new Date()
  const daysInMonth = new Date(year, month, 0).getDate()

  // Calculate uncommitted workdays
  const uncommittedCount: Array<{ workDate: string; workHours: number }> = []
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayOfWeek = new Date(year, month - 1, day).getDay()
    const currentDate = new Date(year, month - 1, day)

    if (dayOfWeek !== 0 && dayOfWeek !== 6 && currentDate <= today) {
      const hasRecord = records.some(r => r.date === date)
      if (!hasRecord) {
        uncommittedCount.push({ workDate: date, workHours: 8 })
      }
    }
  }

  return {
    hasReject: records.some(r => r.status === UtStatus.Rejected),
    submitFlag: true,
    isWorkDays: true,
    totalManDaysRemaining: 58,
    uncommittedCount,
    checkCount: records.filter(r => r.status === UtStatus.Check).length,
    rejectedCount: records.filter(r => r.status === UtStatus.Rejected).length,
    expiredCount: 0,
    list: [...mockProjects, ...records],
  }
}

export function useMonthlyUt(year: number, month: number) {
  return useQuery({
    queryKey: utKeys.monthly(year, month),
    queryFn: () => Promise.resolve(getMockConsumeRes(year, month)),
  })
}

export function useWeeklyUt(weekIndex: number) {
  return useQuery({
    queryKey: utKeys.weekly(weekIndex),
    queryFn: () => Promise.resolve(getMockConsumeRes(2025, 1)),
  })
}

export function useUserProjects() {
  return useQuery({
    queryKey: utKeys.projects(),
    queryFn: () =>
      Promise.resolve(
        mockProjects.map(p => ({
          id: p.projectId,
          name: p.projectName,
          code: p.projectCode || '',
          manDaysRemaining: p.manDaysRemaining,
          manDaysUsed: p.manDaysUsed,
          totalManDays: p.totalManDays,
        })),
      ),
  })
}

export function useRejectedUt() {
  return useQuery({
    queryKey: utKeys.rejected(),
    queryFn: () => Promise.resolve([] as Array<UtItem>),
  })
}

export function useSubmitUt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (_req: UpdateConsumeReq) => {
      // Mock submit - just return success
      return Promise.resolve({})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: utKeys.all })
    },
  })
}
