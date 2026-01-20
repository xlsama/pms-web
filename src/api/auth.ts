import type { ApiRes } from '@/lib/request'
import { request } from '@/lib/request'

export function login(req: LoginReq) {
  return request<LoginRes>('/api/login', {
    method: 'post',
    body: req,
    skip: true,
  })
}

export function changePwd(password: string) {
  return request('/api/changePwd', {
    method: 'post',
    body: { password },
  })
}

export interface LoginReq {
  loginName: string
  password: string
}

export interface LoginRes extends ApiRes<User> {
  success: boolean
  exceptions: unknown
  timestamp: number
  token: string
  theLevel: unknown
  weChatUserInfo: unknown
}

export interface User {
  id: number
  nickName: string | null
  name: string
  loginName: string
  password: string
  status: string
  createTime: string
  createBy: number
  isAdmin: number
  modifyTime: string | null
  modifyBy: number
  openId: string | null
  avatar: string | null
  province: string | null
  city: string | null
  district: string | null
  addr: string | null
  mobile: string | null
  type: string
  levelId: number
  level: string | null
  deleted: boolean
  userCode: string
  deptCode: string
  deptFullName: string | null
  levelCoefficient: number
  entryTime: string
  quitTime: string | null
  utilization: number
  targetUtilization: number
  averageDailySalary: string | null
  dailyShare: string | null
}
