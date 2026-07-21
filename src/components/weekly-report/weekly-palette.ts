import type { CSSProperties } from 'react'

/**
 * 项目色带 8 色循环调色板（来自设计稿 06 画板），按周报内行序分配，第 9 个起循环。
 * 每色含明暗两组：填充底、键线主色、项目名文字、摘要文字。
 */
export interface RibbonColor {
  bg: string
  key: string
  name: string
  sub: string
  bgDark: string
  keyDark: string
  nameDark: string
  subDark: string
}

export const RIBBON_PALETTE: Array<RibbonColor> = [
  // indigo
  {
    bg: '#EEEDFE',
    key: '#6366F1',
    name: '#4F46E5',
    sub: '#6E6B96',
    bgDark: '#232338',
    keyDark: '#818CF8',
    nameDark: '#B7BEFF',
    subDark: '#8A8FC4',
  },
  // teal
  {
    bg: '#DEF4F0',
    key: '#14B8A6',
    name: '#0E9384',
    sub: '#3F7C74',
    bgDark: '#12302C',
    keyDark: '#2DD4BF',
    nameDark: '#6FE9DA',
    subDark: '#4E9E92',
  },
  // amber
  {
    bg: '#FBF0D5',
    key: '#F59E0B',
    name: '#B4791B',
    sub: '#8A6B2E',
    bgDark: '#2E2714',
    keyDark: '#FBBF24',
    nameDark: '#FCD34D',
    subDark: '#C0A566',
  },
  // rose
  {
    bg: '#FCE5EA',
    key: '#F43F5E',
    name: '#E11D48',
    sub: '#9E5568',
    bgDark: '#311A20',
    keyDark: '#FB7185',
    nameDark: '#FDA4AF',
    subDark: '#C07E8C',
  },
  // purple
  {
    bg: '#F3E7FB',
    key: '#A855F7',
    name: '#9333EA',
    sub: '#7A5296',
    bgDark: '#2A1B35',
    keyDark: '#C084FC',
    nameDark: '#DDB8FD',
    subDark: '#9D7FB6',
  },
  // blue
  {
    bg: '#E4EEFE',
    key: '#3B82F6',
    name: '#2563EB',
    sub: '#5578A8',
    bgDark: '#16263B',
    keyDark: '#60A5FA',
    nameDark: '#9DC4FD',
    subDark: '#6E93BE',
  },
  // green
  {
    bg: '#E2F5E9',
    key: '#22C55E',
    name: '#16A34A',
    sub: '#4C8560',
    bgDark: '#14291B',
    keyDark: '#4ADE80',
    nameDark: '#8AEBAC',
    subDark: '#5EA379',
  },
  // orange
  {
    bg: '#FCEBDD',
    key: '#F97316',
    name: '#EA580C',
    sub: '#A5623A',
    bgDark: '#301F10',
    keyDark: '#FB923C',
    nameDark: '#FDBA74',
    subDark: '#BE8A60',
  },
]

export function ribbonColor(index: number): RibbonColor {
  return RIBBON_PALETTE[
    ((index % RIBBON_PALETTE.length) + RIBBON_PALETTE.length) % RIBBON_PALETTE.length
  ]
}

/**
 * 把一组色值注入为 CSS 变量，配合 `bg-(--rb-bg) dark:bg-(--rb-bg-d)` 等类使用，
 * 让色带跟随主题切换而无需重渲染。
 */
export function ribbonVars(color: RibbonColor): CSSProperties {
  return {
    '--rb-bg': color.bg,
    '--rb-bg-d': color.bgDark,
    '--rb-key': color.key,
    '--rb-key-d': color.keyDark,
    '--rb-name': color.name,
    '--rb-name-d': color.nameDark,
    '--rb-sub': color.sub,
    '--rb-sub-d': color.subDark,
  } as CSSProperties
}
