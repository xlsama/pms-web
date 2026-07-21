import { useMemo, useRef } from 'react'

import type { WeeklyUserOption } from '@/api/weekly-report'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

interface WeeklyUserPickerProps {
  users: Array<WeeklyUserOption>
  options?: Array<WeeklyUserOption>
  onChange?: (users: Array<WeeklyUserOption>) => void
  placeholder?: string
}

export function WeeklyUserPicker({
  users,
  options = [],
  onChange,
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
      itemToStringValue={user => user.nickName}
    >
      <ComboboxChips ref={chipsRef} className="min-w-0">
        <ComboboxValue>
          {users.map(user => (
            <ComboboxChip key={user.id}>
              <UserAvatar user={user} compact />
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
            <ComboboxItem key={user.id} value={user}>
              <UserAvatar user={user} />
              <span className="truncate">{user.nickName}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

function UserAvatar({ user, compact = false }: { user: WeeklyUserOption; compact?: boolean }) {
  return (
    <Avatar className={compact ? 'size-4' : 'size-6'}>
      {user.avatar ? <AvatarImage src={user.avatar} alt="" /> : null}
      <AvatarFallback className={compact ? 'text-[9px]' : undefined}>
        {user.nickName.slice(0, 1)}
      </AvatarFallback>
    </Avatar>
  )
}
