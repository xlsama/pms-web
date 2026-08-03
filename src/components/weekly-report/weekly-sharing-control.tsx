import { ChevronRight, UserRoundSearch, UsersRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import type { WeeklyMeetingGroup, WeeklyUserOption } from '@/api/weekly-report'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { WeeklyAvatar } from '@/components/weekly-report/weekly-avatar'
import { WeeklyUserPicker } from '@/components/weekly-report/weekly-user-picker'
import { useTrailingAutosave } from '@/hooks/use-trailing-autosave'
import {
  useDefaultWeeklyGroup,
  useSaveDefaultWeeklyGroup,
  useSharedWeeklyOwners,
  useWeeklyUserOptions,
} from '@/hooks/use-weekly-report'
import { cn } from '@/lib/utils'

interface WeeklySharingControlProps {
  previewUser: WeeklyUserOption | null
  onPreviewUser: (user: WeeklyUserOption | null) => void
}

interface GroupDraft {
  shareEnabled: boolean
  users: Array<WeeklyUserOption>
}

/** 悬停停留多久才算「想打开」，滤掉去点旁边翻周箭头时的顺路划过 */
const OPEN_DELAY = 160
/** 移开后的宽限期，够鼠标从触发器斜着走到浮层 */
const CLOSE_DELAY = 320
/** 触发器与浮层之间的间隙，浮层顶部会补一条等高透明桥把它接上 */
const GAP = 8

export function WeeklySharingControl({ previewUser, onPreviewUser }: WeeklySharingControlProps) {
  const groupQuery = useDefaultWeeklyGroup()
  const sharedOwnersQuery = useSharedWeeklyOwners()
  const { data: userOptions = [] } = useWeeklyUserOptions('', 200)
  const saveMutation = useSaveDefaultWeeklyGroup()
  const [open, setOpen] = useState(false)
  // 点开过就锁定：之后只认点外部 / Esc，鼠标飘出去不再自动收起。
  // 这个面板里要开关、删人、搜人，属于有停留意图的操作面板，不该像 tooltip 那样一移开就没
  const [pinned, setPinned] = useState(false)
  // 用户下拉是 Portal 渲染的，DOM 上不在本浮层内；鼠标移上去会触发本浮层的 mouseleave，
  // 不挡住的话正在选人时整个面板会被收起
  const [pickerOpen, setPickerOpen] = useState(false)
  const [shareEnabled, setShareEnabled] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<Array<WeeklyUserOption>>([])
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const autosave = useTrailingAutosave<GroupDraft, WeeklyMeetingGroup>({
    delay: 500,
    save: draft =>
      saveMutation.mutateAsync({
        shareEnabled: draft.shareEnabled,
        memberUserIds: draft.users.map(user => user.id),
      }),
    onSettled: (_draft, group) => {
      // 队列排空，这份就是服务端最终状态，回写一次抹平本地与服务端的差异
      setShareEnabled(group.shareEnabled)
      setSelectedUsers(group.members)
    },
    onError: () => {
      toast.error('共享设置保存失败，已恢复为最新状态')
      void groupQuery.refetch()
    },
  })

  const { isBusy, flush } = autosave

  useEffect(() => {
    if (!groupQuery.data) return
    // 本地还有没落盘的改动时，别让服务端数据把用户正在做的操作覆盖掉
    if (isBusy()) return
    setShareEnabled(groupQuery.data.shareEnabled)
    setSelectedUsers(groupQuery.data.members)
  }, [groupQuery.data, isBusy])

  useEffect(() => {
    // 面板收起就别再等合并窗口了，立刻落盘
    if (!open) flush()
  }, [open, flush])

  useEffect(
    () => () => {
      if (openTimerRef.current) clearTimeout(openTimerRef.current)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    },
    [],
  )

  function clearTimers() {
    if (openTimerRef.current) clearTimeout(openTimerRef.current)
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    openTimerRef.current = null
    closeTimerRef.current = null
  }

  /**
   * 悬停意图：触发器紧挨着翻周箭头，鼠标去点箭头必然扫过它。
   * 停留够 OPEN_DELAY 才认为是想打开，纯路过不弹。
   */
  function scheduleOpen() {
    clearTimers()
    if (open) return
    openTimerRef.current = setTimeout(() => setOpen(true), OPEN_DELAY)
  }

  /** 进入触发器或浮层：只取消倒计时，打开与否交给 scheduleOpen 决定 */
  function cancelClose() {
    clearTimers()
  }

  function scheduleClose() {
    clearTimers()
    // 锁定中或正在选人，一律不自动收起
    if (pinned || pickerOpen) return
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY)
  }

  function openPinned() {
    clearTimers()
    setPinned(true)
    setOpen(true)
  }

  function changeOpen(next: boolean) {
    clearTimers()
    setOpen(next)
    if (!next) {
      setPinned(false)
      setPickerOpen(false)
    }
  }

  function changeShareEnabled(enabled: boolean) {
    setShareEnabled(enabled)
    // 开关是一次性的显式操作，不进合并窗口，直接发
    autosave.flushNow({ shareEnabled: enabled, users: selectedUsers })
    toast.success(enabled ? '周报共享已开启' : '周报共享已关闭')
  }

  function changeUsers(users: Array<WeeklyUserOption>) {
    setSelectedUsers(users)
    // 连点连删只在停手后发一次，带的是最后一次的名单
    autosave.schedule({ shareEnabled, users })
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            aria-label={previewUser ? `正在查看${previewUser.nickName}的周报` : '周会共享设置'}
            className={cn(
              'h-9 rounded-[10px]',
              previewUser &&
                'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15',
            )}
          />
        }
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onClick={openPinned}
      >
        {previewUser ? (
          <UserRoundSearch data-icon="inline-start" />
        ) : (
          <UsersRound data-icon="inline-start" />
        )}
        <span className="max-w-36 truncate">
          {previewUser ? `${previewUser.nickName}的周报` : '周会共享'}
        </span>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={GAP}
        className="w-[min(440px,calc(100vw-2rem))] p-0"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        // 在面板里点过任何东西（开关 / 搜人 / 删人）都视为要停留，转入锁定
        onPointerDown={openPinned}
      >
        {/* 把触发器与浮层之间的间隙并入浮层的命中区域，
            否则鼠标往下移的途中会离开两者、触发收起 */}
        <span aria-hidden className="absolute inset-x-0 bottom-full" style={{ height: GAP }} />
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-bold">周会共享</span>
          <Switch
            checked={shareEnabled}
            onCheckedChange={changeShareEnabled}
            disabled={groupQuery.isPending}
            aria-label="是否共享自己的周报给选中的成员"
          />
        </div>

        <div className="px-4">
          <p className="mb-2.5 text-[11.5px] font-bold text-muted-foreground">可见成员</p>
          {groupQuery.isPending ? (
            <Skeleton className="h-10 w-full rounded-lg" />
          ) : (
            <WeeklyUserPicker
              users={selectedUsers}
              options={userOptions}
              onChange={changeUsers}
              onOpenChange={setPickerOpen}
              placeholder="搜索并选择成员…"
            />
          )}
        </div>

        <div className="p-2">
          <p className="px-2 pt-1 pb-1.5 text-[11.5px] font-bold text-muted-foreground">
            我能查看的用户
          </p>
          {sharedOwnersQuery.isPending ? (
            <Skeleton className="mx-2 mb-2 h-10 rounded-lg" />
          ) : !sharedOwnersQuery.data?.length ? (
            <p className="px-2 pb-2 text-xs text-muted-foreground">暂时没有其他用户向你共享周报</p>
          ) : (
            <div className="flex flex-col gap-1">
              {sharedOwnersQuery.data.map(user => (
                <button
                  key={user.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-muted',
                    previewUser?.id === user.id && 'bg-gantt/8 hover:bg-gantt/10',
                  )}
                  onClick={() => {
                    onPreviewUser(user)
                    // 走 changeOpen 而不是 setOpen，否则锁定态不会被清掉
                    changeOpen(false)
                  }}
                >
                  <WeeklyAvatar name={user.nickName} seed={user.id} src={user.avatar} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
                    {user.nickName}
                  </span>
                  {previewUser?.id === user.id ? (
                    <span className="shrink-0 text-[11px] font-semibold text-gantt">正在查看</span>
                  ) : null}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="sr-only" aria-live="polite">
          {autosave.saving ? '正在自动保存共享设置' : '共享设置已自动保存'}
        </span>
      </PopoverContent>
    </Popover>
  )
}
