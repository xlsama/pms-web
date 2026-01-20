import { ofetch } from 'ofetch'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'

export interface ApiRes<T = unknown> {
  code: number
  message: string
  data: T
}

export const request = ofetch.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  retry: false,

  onRequest({ options }) {
    const token = useAuthStore.getState().token
    if (token) {
      options.headers.set('token', token)
    }
  },

  onResponse({ response, options }) {
    // 跳过错误状态码,让 onResponseError 处理
    if (!response.ok) return

    const data = response._data as ApiRes

    if (data.code !== 200) {
      handleError(data.message || '接口错误，请稍后重试')
    }

    if (options.skip) {
      return
    }

    response._data = data.data
  },

  onResponseError({ response, error }) {
    const { status } = response
    const data = response._data as ApiRes

    if (status === 401) {
      toast.error('登录超时，请重新登录')

      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
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

declare module 'ofetch' {
  interface FetchOptions {
    skip?: boolean
  }
}
