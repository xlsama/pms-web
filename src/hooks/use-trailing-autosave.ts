import { useCallback, useEffect, useRef, useState } from 'react'

interface TrailingAutosaveOptions<TPayload, TResult> {
  /** 真正落盘的请求。同一时刻只会有一个在飞 */
  save: (payload: TPayload) => Promise<TResult>
  /** 连续操作的合并窗口（毫秒），停手后才发请求 */
  delay?: number
  /** 队列彻底排空（最后一次请求成功且没有新改动）时回调，可用于回写服务端最终值 */
  onSettled?: (payload: TPayload, result: TResult) => void
  /** 请求失败。此时未发出的改动会被丢弃，调用方应回滚到服务端状态 */
  onError?: (error: unknown) => void
}

/**
 * 串行 + 尾部合并的自动保存。
 *
 * 解决的问题：连续快速操作（比如接连删掉两个成员）时，逐次发请求会并发，
 * 慢的那个后返回就会把中间态当成最终态写回，表现为「删掉的又冒出来」。
 *
 * 两条约束保证最终状态一定等于用户最后一次操作：
 * 1. 任意时刻只有一个请求在飞，请求不会乱序到达服务端；
 * 2. 飞行期间的改动只留最新一份，落地后接着发它，中间态直接丢弃。
 */
export function useTrailingAutosave<TPayload, TResult>({
  save,
  delay = 400,
  onSettled,
  onError,
}: TrailingAutosaveOptions<TPayload, TResult>) {
  const [saving, setSaving] = useState(false)
  // 待发送的最新一份改动，用 box 包一层以区分「没有改动」和「改动的值是 undefined」
  const pendingRef = useRef<{ value: TPayload } | null>(null)
  const inFlightRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  // 回调放 ref，调用方就不必为了稳定引用而层层 useCallback
  const handlersRef = useRef({ save, onSettled, onError })
  handlersRef.current = { save, onSettled, onError }

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  /** 立刻把待发改动发出去；有请求在飞则等它结束后自动续发 */
  const flush = useCallback(() => {
    clearTimer()
    if (inFlightRef.current) return
    const pending = pendingRef.current
    if (!pending) return

    pendingRef.current = null
    inFlightRef.current = true
    if (mountedRef.current) setSaving(true)

    const handlers = handlersRef.current
    handlers.save(pending.value).then(
      result => {
        inFlightRef.current = false
        // 这一趟在飞时用户又改过，那就接着把最新的发出去，本次结果作废
        if (pendingRef.current) {
          flush()
          return
        }
        if (mountedRef.current) setSaving(false)
        handlers.onSettled?.(pending.value, result)
      },
      error => {
        inFlightRef.current = false
        // 服务端状态已不可知，后续改动一并丢弃，由调用方拉取真实状态
        pendingRef.current = null
        if (mountedRef.current) setSaving(false)
        handlers.onError?.(error)
      },
    )
  }, [])

  /** 记录改动并重新计时，停手 delay 后才真正发请求 */
  const schedule = useCallback(
    (payload: TPayload) => {
      pendingRef.current = { value: payload }
      clearTimer()
      timerRef.current = setTimeout(flush, delay)
    },
    [delay, flush],
  )

  /** 不等合并窗口，立即发（开关这类一次性操作用） */
  const flushNow = useCallback(
    (payload: TPayload) => {
      pendingRef.current = { value: payload }
      flush()
    },
    [flush],
  )

  /** 是否还有改动没落盘。为真时不要用服务端数据覆盖本地编辑 */
  const isBusy = useCallback(() => inFlightRef.current || pendingRef.current !== null, [])

  useEffect(
    () => () => {
      mountedRef.current = false
      clearTimer()
      // 卸载时别丢掉还在合并窗口里的改动
      if (!inFlightRef.current && pendingRef.current) {
        void handlersRef.current.save(pendingRef.current.value)
      }
    },
    [],
  )

  return { schedule, flushNow, flush, isBusy, saving }
}
