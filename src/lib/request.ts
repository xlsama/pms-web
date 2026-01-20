import { ofetch } from 'ofetch'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'

export interface ApiResponse<T = unknown> {
  status: number
  message: string
  result: T
}

export const request = ofetch.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 600000,
  retry: false,

  onRequest({ options }) {
    const token = useAuthStore.getState().token
    if (token) {
      options.headers.set('Authorization', `Bearer ${token}`)
    }
  },

  onResponse({ response }) {
    // 跳过错误状态码,让 onResponseError 处理
    if (!response.ok) return

    const data = response._data as ApiResponse

    if (data.status !== 0) {
      handleError(data.message || '接口错误，请稍后重试')
    }

    response._data = data.result
  },

  onResponseError({ response, error }) {
    const { status } = response
    const data = response._data as ApiResponse

    if (status === 401) {
      toast.error('登录超时，请重新登录')

      useAuthStore.getState().clearAuth()
      window.location.href = `${import.meta.env.BASE_URL}login`
      return
    } else if (status === 403) {
      handleError(data.message || '权限不足', error)
    } else if (status >= 500) {
      handleError(data.message || '服务器错误，请稍后重试', error)
    }

    throw error
  },
})

function handleError(msg: string, cause?: unknown): never {
  toast.error(msg)
  throw cause instanceof Error ? cause : new Error(msg, { cause })
}
