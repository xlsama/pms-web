import { useMemo, useRef } from 'react'

import type { WeeklyUserOption } from '@/api/weekly-report'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from '@/components/ui/combobox'

import { WeeklyAvatar } from './weekly-avatar'

interface WeeklyUserPickerProps {
  users: Array<WeeklyUserOption>
  options?: Array<WeeklyUserOption>
  onChange?: (users: Array<WeeklyUserOption>) => void
  /** 下拉展开状态。外层浮层要靠它判断「用户正在选人」，避免把自己收起来 */
  onOpenChange?: (open: boolean) => void
  placeholder?: string
}

export function WeeklyUserPicker({
  users,
  options = [],
  onChange,
  onOpenChange,
  placeholder = '搜索并选择用户…',
}: WeeklyUserPickerProps) {
  const availableUsers = useMemo(() => {
    const items = new Map<number, WeeklyUserOption>()
    for (const user of [...options, ...users]) items.set(user.id, user)
    return Array.from(items.values())
  }, [options, users])
  // 下拉浮层锚定整个 chips 输入框（默认锚点是内部 input，位置宽度会随已选人数漂移）
  const chipsRef = useRef<HTMLDivElement | null>(null)

  return (
    <Combobox
      items={availableUsers}
      multiple
      value={users}
      onValueChange={value => onChange?.(value)}
      onOpenChange={next => onOpenChange?.(next)}
      itemToStringValue={user => user.nickName}
    >
      <ComboboxChips ref={chipsRef} className="min-w-0">
        <ComboboxValue>
          {users.map(user => (
            <ComboboxChip
              key={user.id}
              // 基类在有删除按钮时把 pr 压成 0，这里用同优先级的 has-* 变体改回来，
              // 否则 × 会贴着 chip 右边缘
              className="h-7 gap-1.5 rounded-full pl-2 has-data-[slot=combobox-chip-remove]:pr-1"
            >
              <WeeklyAvatar name={user.nickName} seed={user.id} src={user.avatar} size="sm" />
              <span className="max-w-24 truncate">{user.nickName}</span>
            </ComboboxChip>
          ))}
        </ComboboxValue>
        <ComboboxChipsInput placeholder={users.length > 0 ? undefined : placeholder} />
      </ComboboxChips>
      <ComboboxContent anchor={chipsRef} sideOffset={6}>
        <ComboboxEmpty>没有找到匹配用户</ComboboxEmpty>
        <ComboboxList>
          {user => (
            <ComboboxItem key={user.id} value={user} className="gap-2.5 py-1.5 pl-2">
              <WeeklyAvatar name={user.nickName} seed={user.id} src={user.avatar} />
              <span className="truncate">{user.nickName}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
