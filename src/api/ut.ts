import { request } from '@/lib/request'

function normalizeDateField(item: UtItem): UtItem {
  let dateStr: string | null = null
  if (Array.isArray(item.date)) {
    const [year, month, day] = item.date as unknown as [number, number, number]
    dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  } else if (typeof item.date === 'string') {
    dateStr = item.date
  }
  return { ...item, date: dateStr }
}

export const getConsume = async (req: { date: string }): Promise<ConsumeRes> => {
  const res = await request<ConsumeRes>('/api/user/consume', {
    params: { date: req.date, loadHistory: true },
  })
  return { ...res, list: res.list.map(normalizeDateField) }
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
