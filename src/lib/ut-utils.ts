import { getDayDetail, getLunarDate, isWorkday as isChineseWorkday } from 'chinese-days'
import { eachDayOfInterval, format, isWeekend } from 'date-fns'

import { UtStatus } from '@/types/ut'
import type { DayStatus } from '@/types/ut'

/**
 * Get status color class for UT allocation badge
 */
export function getStatusColorClass(status: UtStatus): string {
  switch (status) {
    case UtStatus.Confirmed:
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
    case UtStatus.Check:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
    case UtStatus.Rejected:
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

/**
 * Check if a project is a leave project (无薪假 or 带薪假)
 */
export function isLeaveProject(name: string): boolean {
  return name.startsWith('【无薪假】') || name.startsWith('【带薪假】')
}

/** 判断是否为工作日（含调休） */
export function isWorkday(date: string): boolean {
  return isChineseWorkday(date)
}

/** 统计区间内所有工作日数量（不截断到今天） */
export function countWorkdaysInRange(start: Date, end: Date): number {
  return eachDayOfInterval({ start, end }).filter(d => isWorkday(format(d, 'yyyy-MM-dd'))).length
}

/** 调休类型：'work' = 调休上班（周末）, 'rest' = 周末或节假日休息, null = 普通工作日 */
export function getAdjustmentType(date: string): 'work' | 'rest' | null {
  const workday = isChineseWorkday(date)
  const weekend = isWeekend(new Date(date))
  if (workday && weekend) return 'work'
  if (!workday || weekend) return 'rest'
  return null
}

/**
 * 获取日期的农历/节日标签
 * 优先级：国定假日 > 农历日期
 */
export function getDateLabel(date: string): { text: string; isFestival: boolean } {
  const lunar = getLunarDate(date)

  // 优先级 1: 国定假日（仅在节日当天显示）
  const detail = getDayDetail(date)
  if (detail.name.includes(',')) {
    const holidayName = detail.name.split(',')[1]
    if (isCanonicalHolidayDate(date, holidayName, lunar)) {
      return { text: holidayName, isFestival: true }
    }
  }

  // 优先级 2: 农历日期（初一显示月名，其他显示日期）
  const text = lunar.lunarDay === 1 ? lunar.lunarMonCN : lunar.lunarDayCN
  return { text, isFestival: false }
}

function isCanonicalHolidayDate(
  date: string,
  name: string,
  lunar: ReturnType<typeof getLunarDate>,
): boolean {
  const d = new Date(date)
  const m = d.getMonth() + 1
  const day = d.getDate()

  switch (name) {
    case '元旦':
      return m === 1 && day === 1
    case '春节':
      return lunar.lunarMon === 1 && lunar.lunarDay === 1
    case '清明':
      return m === 4 && day === getQingmingDay(d.getFullYear())
    case '劳动节':
      return m === 5 && day === 1
    case '端午':
      return lunar.lunarMon === 5 && lunar.lunarDay === 5
    case '中秋':
      return lunar.lunarMon === 8 && lunar.lunarDay === 15
    case '国庆':
      return m === 10 && day === 1
    default:
      return false
  }
}

/** 21 世纪清明节气日期：floor(Y×0.2422+4.81) - floor(Y/4)，Y 为年份后两位 */
function getQingmingDay(year: number): number {
  const y = year % 100
  return Math.floor(y * 0.2422 + 4.81) - Math.floor(y / 4)
}

/**
 * Get background color class for calendar cell based on DayStatus
 */
export function getDayStatusColorClass(status: DayStatus): string {
  switch (status) {
    case 'confirmed':
      return 'bg-green-50 dark:bg-green-800/30'
    case 'complete':
      return 'bg-blue-50 dark:bg-blue-800/30'
    case 'check':
      return 'bg-yellow-50 dark:bg-yellow-800/30'
    case 'rejected':
      return 'bg-red-50 dark:bg-red-800/30'
    case 'partial':
      return 'bg-orange-50 dark:bg-orange-800/30'
    case 'empty':
    default:
      return ''
  }
}
