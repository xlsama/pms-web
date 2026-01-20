import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import YooptaEditor, { createYooptaEditor, type YooptaContentValue } from '@yoopta/editor'
import Paragraph from '@yoopta/paragraph'
import { HeadingTwo, HeadingThree } from '@yoopta/headings'
import { BulletedList, NumberedList } from '@yoopta/lists'
import { Bold, Italic, CodeMark } from '@yoopta/marks'
import { markdown } from '@yoopta/exports'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_app/ut-tmp')({
  component: RouteComponent,
})

const STORAGE_KEY = 'ut-content'

const DEFAULT_TEMPLATE = `## 本月一共 10 UT，\`01.01~01.31\`

### AIGC Chatbot

- 修复用户管理-最后在线时间展示问题，添加排序
- 新增对话聊天页面

### Starbucks BTS

- 新增了打标签页面
- 联调打标签接口
`

const plugins = [Paragraph, HeadingTwo, HeadingThree, BulletedList, NumberedList]
const marks = [Bold, Italic, CodeMark]

function RouteComponent() {
  const editor = useMemo(() => createYooptaEditor(), [])
  const [value, setValue] = useState<YooptaContentValue>()
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialized = useRef(false)

  // Load from localStorage or use default template
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Object.keys(parsed).length > 0) {
          editor.setEditorValue(parsed)
          setValue(parsed)
          return
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    // Use default template
    const defaultValue = markdown.deserialize(editor, DEFAULT_TEMPLATE)
    editor.setEditorValue(defaultValue)
    setValue(defaultValue)
  }, [editor])

  // Debounced save
  const handleChange = (newValue: YooptaContentValue) => {
    setValue(newValue)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newValue))
    }, 1000)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Export to Markdown
  const handleExport = () => {
    const data = editor.getEditorValue()
    const md = markdown.serialize(editor, data)
    navigator.clipboard.writeText(md)
    toast.success('已复制到剪贴板')
  }

  // Reset to template
  const handleResetTemplate = () => {
    const defaultValue = markdown.deserialize(editor, DEFAULT_TEMPLATE)
    editor.setEditorValue(defaultValue)
    setValue(defaultValue)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultValue))
  }

  return (
    <div className="flex h-full flex-col px-6 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">UT 编辑器</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetTemplate}>
            重置模板
          </Button>
          <Button onClick={handleExport}>导出 Markdown</Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto rounded-lg border p-4">
        <YooptaEditor
          editor={editor}
          plugins={plugins}
          marks={marks}
          value={value}
          onChange={handleChange}
          placeholder="输入内容..."
        />
      </div>
    </div>
  )
}
