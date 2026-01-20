import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import YooptaEditor, { createYooptaEditor, type YooptaContentValue } from '@yoopta/editor'
import Paragraph from '@yoopta/paragraph'
import Headings from '@yoopta/headings'
import Lists from '@yoopta/lists'
import Code from '@yoopta/code'
import { Bold, Italic, Strike, Underline, CodeMark } from '@yoopta/marks'
import Toolbar, { DefaultToolbarRender } from '@yoopta/toolbar'
import ActionMenu, { DefaultActionMenuRender } from '@yoopta/action-menu-list'
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

const plugins = [
  Paragraph,
  Headings.HeadingTwo,
  Headings.HeadingThree,
  Lists.BulletedList,
  Lists.NumberedList,
  Code,
]

const marks = [Bold, Italic, Strike, Underline, CodeMark]

const tools = {
  Toolbar: {
    tool: Toolbar,
    render: DefaultToolbarRender,
  },
  ActionMenu: {
    tool: ActionMenu,
    render: DefaultActionMenuRender,
  },
}

function getInitialContent(): YooptaContentValue | undefined {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return undefined
    const parsed = JSON.parse(stored)
    return Object.keys(parsed).length > 0 ? parsed : undefined
  } catch {
    return undefined
  }
}

function RouteComponent() {
  const [editor] = useState(() => createYooptaEditor())
  const [content] = useState(getInitialContent)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced save
  const handleChange = (value: YooptaContentValue) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
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

  // Import template
  const handleImportTemplate = () => {
    const value = markdown.deserialize(editor, DEFAULT_TEMPLATE)
    editor.setEditorValue(value)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  }

  return (
    <div className="flex h-full flex-col px-6 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">UT 编辑器</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportTemplate}>
            导入模板
          </Button>
          <Button onClick={handleExport}>导出 Markdown</Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto rounded-lg border p-4">
        <YooptaEditor
          editor={editor}
          plugins={plugins}
          marks={marks}
          tools={tools}
          {...(content ? { value: content } : {})}
          onChange={handleChange}
          placeholder="输入 / 唤起菜单..."
          className="ut-editor"
        />
      </div>
    </div>
  )
}
