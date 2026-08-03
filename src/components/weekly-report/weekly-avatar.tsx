import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

/**
 * 无头像时的兜底底色。同一个人每次进来颜色一致（按用户 ID 取模），
 * 用双色斜向渐变而非纯色——纯色块在一列头像里容易糊成一片。
 */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #4F8DF5, #56C596)', // 蓝 → 绿
  'linear-gradient(135deg, #41A85F, #A9C441)', // 绿 → 黄绿
  'linear-gradient(135deg, #6366F1, #A855F7)', // 靛 → 紫
  'linear-gradient(135deg, #06B6D4, #3B82F6)', // 青 → 蓝
  'linear-gradient(135deg, #F59E0B, #F97316)', // 琥珀 → 橙
  'linear-gradient(135deg, #EC4899, #A855F7)', // 粉 → 紫
  'linear-gradient(135deg, #EF4444, #FB923C)', // 红 → 橙
  'linear-gradient(135deg, #14B8A6, #4ADE80)', // 青绿 → 绿
] as const

const CJK = /[㐀-鿿豈-﫿]/

/**
 * 头像文字。
 * 中文名：两字全展示，三字及以上取后两字（即名，姓在同事间重复率高，区分度差）。
 * 拉丁名：有空格取两个词首字母，否则取前两个字母。
 */
export function avatarInitials(name: string): string {
  const value = (name ?? '').trim()
  if (!value) return '?'

  if (CJK.test(value)) {
    const chars = Array.from(value)
    return chars.length >= 3 ? chars.slice(-2).join('') : chars.join('')
  }

  const words = value.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return value.slice(0, 2).toUpperCase()
}

export function avatarGradient(seed: number): string {
  const index = Math.abs(Math.trunc(seed)) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[index]
}

/** sm 用于已选人员的 chip，md 用于下拉列表和成员榜，lg 用于顶部横幅 */
const SIZES = {
  sm: { box: 'size-[22px]', text: 'text-[8px]' },
  md: { box: 'size-8', text: 'text-[11px]' },
  lg: { box: 'size-9', text: 'text-[12px]' },
} as const

export function WeeklyAvatar({
  name,
  seed,
  src,
  size = 'md',
  className,
}: {
  name: string
  /** 取色种子，传用户 ID 保证同一个人颜色稳定 */
  seed: number
  src?: string | null
  size?: keyof typeof SIZES
  className?: string
}) {
  const preset = SIZES[size]
  return (
    <Avatar className={cn('shrink-0', preset.box, className)}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback
        // text-white! 是必须的：下拉项 highlighted 时会用 `**:text-accent-foreground`
        // 给所有后代改色，把头像上的白字压成深色，落在渐变底上几乎看不清
        className={cn('font-semibold tracking-tight text-white!', preset.text)}
        style={{ backgroundImage: avatarGradient(seed) }}
      >
        {avatarInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
