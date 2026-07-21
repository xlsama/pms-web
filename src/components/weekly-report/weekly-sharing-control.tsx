import { ChevronRight, UserRoundSearch, UsersRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import type { WeeklyUserOption } from '@/api/weekly-report'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { WeeklyUserPicker } from '@/components/weekly-report/weekly-user-picker'
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

export function WeeklySharingControl({ previewUser, onPreviewUser }: WeeklySharingControlProps) {
  const groupQuery = useDefaultWeeklyGroup()
  const sharedOwnersQuery = useSharedWeeklyOwners()
  const { data: userOptions = [] } = useWeeklyUserOptions('', 200)
  const saveMutation = useSaveDefaultWeeklyGroup()
  const [open, setOpen] = useState(false)
  const [shareEnabled, setShareEnabled] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<Array<WeeklyUserOption>>([])
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!groupQuery.data) return
    setShareEnabled(groupQuery.data.shareEnabled)
    setSelectedUsers(groupQuery.data.members)
  }, [groupQuery.data])

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    },
    [],
  )

  function cancelClose() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
    setOpen(true)
  }

  function scheduleClose() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => setOpen(false), 180)
  }

  function persist(enabled: boolean, users: Array<WeeklyUserOption>, successMessage?: string) {
    saveMutation.mutate(
      { shareEnabled: enabled, memberUserIds: users.map(user => user.id) },
      {
        onSuccess: () => {
          if (successMessage) toast.success(successMessage)
        },
        onError: () => {
          void groupQuery.refetch()
        },
      },
    )
  }

  function changeShareEnabled(enabled: boolean) {
    setShareEnabled(enabled)
    persist(enabled, selectedUsers, enabled ? '周报共享已开启' : '周报共享已关闭')
  }

  function changeUsers(users: Array<WeeklyUserOption>) {
    setSelectedUsers(users)
    persist(shareEnabled, users)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
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
        sideOffset={8}
        className="w-[min(380px,calc(100vw-2rem))] p-0"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-bold">周会共享</span>
          <Switch
            checked={shareEnabled}
            onCheckedChange={changeShareEnabled}
            disabled={saveMutation.isPending || groupQuery.isPending}
            aria-label="是否共享自己的周报给选中的成员"
          />
        </div>

        <div className="px-4 py-3.5">
          <p className="mb-2.5 text-[11.5px] font-bold text-muted-foreground">可见成员</p>
          {groupQuery.isPending ? (
            <Skeleton className="h-10 w-full rounded-lg" />
          ) : (
            <WeeklyUserPicker
              users={selectedUsers}
              options={userOptions}
              onChange={changeUsers}
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
                    'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-muted',
                    previewUser?.id === user.id && 'bg-gantt/8 hover:bg-gantt/10',
                  )}
                  onClick={() => {
                    onPreviewUser(user)
                    setOpen(false)
                  }}
                >
                  <Avatar className="size-6">
                    {user.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
                    <AvatarFallback className="text-[10.5px] font-bold">
                      {user.nickName.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
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
          {saveMutation.isPending ? '正在自动保存共享设置' : '共享设置已自动保存'}
        </span>
      </PopoverContent>
    </Popover>
  )
}
