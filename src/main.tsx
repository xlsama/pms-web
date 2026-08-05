import './styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { routeTree } from './routeTree.gen'

// 不重试：错误已由 request.ts 统一 toast，默认的 retry:3 会把同一条错误重复弹 4 次
// （权限不足这类失败重试也不可能成功）。ofetch 的 retry:false 只管它自己那层，管不到这里。
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const router = createRouter({
  routeTree,
  // 与 vite.config base 对齐（去掉末尾 /）
  basepath: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
  context: {
    queryClient,
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
