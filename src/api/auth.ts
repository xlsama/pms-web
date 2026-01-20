import type { User } from '@/stores/auth'
import { request } from '@/lib/request'

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResponse {
  data: User & { token: string }
}

export function login(params: LoginParams) {
  return request<LoginResponse>('/api/login', {
    method: 'POST',
    body: params,
  })
}
