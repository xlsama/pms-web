import { request } from '@/lib/request'

export const getConsume = (req: { date?: string }) => {
  return request<ConsumeRes>('/api/user/consume', {
    params: req,
  })
}

export const updateConsume = (req: UpdateConsumeReq) => {
  return request<unknown>('/api/user/consume', {
    method: 'put',
    body: req,
  })
}

export const getRejectUt = () => {
  return request<Array<UtItem>>('/api/user/reject')
}

// Get monthly UT data
export const getMonthlyUt = (req: { year: number; month: number }) => {
  // Use first day of month as date parameter
  const date = `${req.year}-${String(req.month).padStart(2, '0')}-01`
  return request<ConsumeRes>('/api/user/consume', {
    params: { date },
  })
}

// Get weekly UT data
export const getWeeklyUt = (req: { weekIndex: number }) => {
  return request<ConsumeRes>('/api/user/consume', {
    params: { weekIndex: req.weekIndex },
  })
}

// Get user projects
export const getUserProjects = () => {
  return request<Array<ProjectListItem>>('/api/user/projects')
}

export interface ProjectListItem {
  id: number
  name: string
  code: string
  manDaysRemaining: number
  manDaysUsed: number
  totalManDays: number
}

export interface UpdateConsumeReq {
  weekIndex?: number
  list: Array<{
    /**
     * example: 2025-12-01
     */
    date: string
    projectId: number
    projectName: string
    status: UtStatus
    type: string
    utType: number
    val: number
  }>
}

export interface ConsumeRes {
  hasReject: boolean | null
  submitFlag: boolean
  isWorkDays: boolean
  totalManDaysRemaining: number
  uncommittedCount: Array<{
    workDate: string
    workHours: number
  }>
  checkCount: number
  rejectedCount: number
  expiredCount: number | null
  list: Array<UtItem>
}

export enum UtStatus {
  Rejected = 'rejected',
  Confirmed = 'confirmed',
  Check = 'check',
  None = '',
}

export interface UtItem {
  id: number
  userId: number | null
  userName: string | null
  userCode: string | null
  userType: string | null
  type: string
  projectId: number
  projectCode: string | null
  projectName: string
  val: number
  levelCoefficient: number | null
  standardVal: number | null
  status: UtStatus
  userStatus: string | null
  date: string | null
  dates: string | null
  cost: number | null
  deleted: boolean | null
  createTime: string | null
  createTimes: string | null
  createTimeFull: string | null
  createTimeFulls: string | null
  createBy: number | null
  modifyTime: string | null
  modifyTimes: string | null
  modifyBy: number | null
  weekIndex: number | null
  utType: string | null
  utTypes: string | null
  workOvertime: number
  hasChildren: boolean | null
  children: Array<UtItem> | null
  totalManDays: number
  manDaysUsed: number
  manDaysRemaining: number
  stage: string
  workOvertimeStatus: string | null
}
