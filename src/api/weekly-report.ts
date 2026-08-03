import { request } from '@/lib/request'

export interface WeeklyUserOption {
  id: number
  nickName: string
  avatar: string | null
}

export interface WeeklyProjectOption {
  id: number
  projectCode: string | null
  projectName: string
  stage: string | null
  projectTotalUt: number
  projectConfirmedUt: number
  myAllocatedUt: number
  myConfirmedUt: number
}

export interface WeeklyProjectMetrics {
  projectTotalUt: number
  projectConfirmedUt: number
  projectPendingUt: number
  myAllocatedUt: number
  myConfirmedUt: number
  myPendingUt: number
  myRemainingUt: number
  myWeekActualUt: number
  myWeekPendingUt: number
}

/** UT 日历里的填报状态，与 `@/types/ut` 的 UtStatus 同源 */
export type WeeklyUtStatus = 'check' | 'confirmed' | 'rejected'

/**
 * 本周实际 UT（只读投影，来自 poa_user_consume）。
 * 周报只读取不写入：计划存周报自己的表，实际 UT 永远只由 UT 日历页维护。
 */
export interface WeeklyActualUt {
  workDate: string
  projectId: number
  projectName: string
  val: number
  status: WeeklyUtStatus
}

export interface WeeklyPlanDay {
  id?: number
  workDate: string
  assigned: boolean
  plannedUt?: number
  dayNote: string | null
  workday: boolean
}

export interface WeeklyPlanProject {
  id?: number
  projectId: number
  projectName: string
  projectCode: string | null
  planContent: string | null
  resultContent: string | null
  sortOrder: number
  assignedDays: number
  totalPlannedUt?: number
  /** 历史周报列表不返回 metrics，仅当周详情携带 */
  metrics?: WeeklyProjectMetrics | null
  days: Array<WeeklyPlanDay>
}

export interface WeeklyPlan {
  id?: number
  version: number
  isoWeekYear: number
  isoWeekNum: number
  weekStartDate: string
  weekEndDate: string
  userId: number
  userNickName: string
  status: 'draft' | 'published'
  publishedAt: string | null
  editable: boolean
  weekDays: Array<{ workDate: string; workday: boolean }>
  projects: Array<WeeklyPlanProject>
  viewers: Array<WeeklyUserOption>
  /** 本周该用户在 UT 日历里的实际填报，前端与计划合并成甘特图 */
  actuals: Array<WeeklyActualUt>
}

export interface WeeklyMeetingGroup {
  id?: number
  groupName: string
  shareEnabled: boolean
  members: Array<WeeklyUserOption>
}

export interface WeeklyProjectAnalytics {
  project: WeeklyProjectOption
  canViewMembers: boolean
  trend: Array<{
    weekStartDate: string
    plannedDays: number
    plannedUt?: number
    confirmedUt: number
  }>
  members: Array<{
    userId: number
    nickName: string
    avatar?: string | null
    plannedDays: number
    plannedUt?: number
    confirmedUt: number
  }>
}

export interface WeeklyPlanSaveRequest {
  version: number
  projects: Array<{
    projectId: number
    planContent: string
    resultContent: string
    sortOrder: number
    days: Array<{ workDate: string; assigned: boolean; dayNote: string }>
  }>
}

export const getWeeklyPlan = (ownerUserId: number, weekStart: string) =>
  request<WeeklyPlan>(`/api/v2/weekly-plans/users/${ownerUserId}`, { params: { weekStart } })

export const saveWeeklyPlan = (weekStart: string, body: WeeklyPlanSaveRequest) =>
  request<WeeklyPlan>(`/api/v2/weekly-plans/me/${weekStart}`, { method: 'put', body })

export const getWeeklyProjectOptions = (q = '', limit = 20) =>
  request<Array<WeeklyProjectOption>>('/api/v2/weekly-plans/project-options', {
    params: { q, limit },
  })

export const getWeeklyUserOptions = (q = '', limit = 200) =>
  request<Array<WeeklyUserOption>>('/api/v2/weekly-plans/user-options', {
    params: { q, limit },
  })

export const getDefaultWeeklyGroup = () =>
  request<WeeklyMeetingGroup>('/api/v2/weekly-plans/meeting-group/default')

export const getSharedWeeklyOwners = () =>
  request<Array<WeeklyUserOption>>('/api/v2/weekly-plans/meeting-group/shared-owners')

export const saveDefaultWeeklyGroup = (body: {
  memberUserIds: Array<number>
  shareEnabled: boolean
}) =>
  request<WeeklyMeetingGroup>('/api/v2/weekly-plans/meeting-group/default', {
    method: 'put',
    body,
  })

export const getWeeklyProjectAnalytics = (projectId: number, from: string, to: string) =>
  request<WeeklyProjectAnalytics>('/api/v2/weekly-plans/analytics/project', {
    params: { projectId, from, to },
  })
