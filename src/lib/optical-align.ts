/**
 * 全角开括号（【（《「等）的字形贴在字面框右侧，左边自带约 0.5~0.7em 留白。
 * 出现在行首时，这段留白会让整行看起来比相邻行往右缩进一截。
 * 这里实测该字符在目标字体下的墨迹起点，供调用方用负 margin 把它悬挂出去。
 *
 * CSS 的 hanging-punctuation / text-spacing-trim 是标准解法，但截至目前
 * Chrome 不支持前者，后者对中文回退字体也不生效，只能自己量。
 */

const OPENING_PUNCTUATION = /[【〖〔［｛（《〈「『]/

const insetCache = new Map<string, number>()

let measureContext: CanvasRenderingContext2D | null | undefined

function getMeasureContext() {
  if (measureContext === undefined) {
    measureContext =
      typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  }
  return measureContext
}

/** 返回首字符需要向左悬挂的像素数，不需要悬挂时为 0。 */
export function leadingPunctuationInset(
  text: string | undefined,
  { fontSize, fontWeight = 400 }: { fontSize: number; fontWeight?: number },
) {
  const char = text?.[0]
  if (!char || !OPENING_PUNCTUATION.test(char)) return 0

  const context = getMeasureContext()
  if (!context) return 0

  const family = getComputedStyle(document.body).fontFamily || 'sans-serif'
  const font = `${fontWeight} ${fontSize}px ${family}`
  const key = `${font}|${char}`

  const cached = insetCache.get(key)
  if (cached !== undefined) return cached

  context.font = font
  // actualBoundingBoxLeft 以「向左为正」计量，字形贴右时为负值，取反即左侧留白
  const inset = Math.max(0, -context.measureText(char).actualBoundingBoxLeft)
  insetCache.set(key, inset)
  return inset
}
