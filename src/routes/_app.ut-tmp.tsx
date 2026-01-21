import { useEffect, useMemo, useRef, useState } from 'react'
import { useDebounceFn } from 'ahooks'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import YooptaEditor, { createYooptaEditor } from '@yoopta/editor'
import Paragraph from '@yoopta/paragraph'
import { HeadingThree, HeadingTwo } from '@yoopta/headings'
import { BulletedList, NumberedList } from '@yoopta/lists'
import Code from '@yoopta/code'
import Divider from '@yoopta/divider'
import Image from '@yoopta/image'
import Table from '@yoopta/table'
import Link from '@yoopta/link'
import Accordion from '@yoopta/accordion'
import { Bold, CodeMark, Italic } from '@yoopta/marks'
import { markdown } from '@yoopta/exports'
import ActionMenuList, { DefaultActionMenuRender } from '@yoopta/action-menu-list'
import Toolbar, { DefaultToolbarRender } from '@yoopta/toolbar'
import LinkTool, { DefaultLinkToolRender } from '@yoopta/link-tool'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import type { YooptaContentValue } from '@yoopta/editor'
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

const plugins: Array<any> = [
  Paragraph,
  HeadingTwo,
  HeadingThree,
  BulletedList,
  NumberedList,
  Code,
  Divider,
  Image,
  Table,
  Link,
  Accordion,
]
const marks = [Bold, Italic, CodeMark]

const TOOLS = {
  ActionMenu: {
    tool: ActionMenuList,
    render: DefaultActionMenuRender,
  },
  Toolbar: {
    tool: Toolbar,
    render: DefaultToolbarRender,
  },
  LinkTool: {
    tool: LinkTool,
    render: DefaultLinkToolRender,
  },
}

function RouteComponent() {
  const router = useRouter()
  const editor = useMemo(() => createYooptaEditor(), [])
  const [value, setValue] = useState<YooptaContentValue>()
  const initialized = useRef(false)

  const { run: debouncedSave } = useDebounceFn(
    (newValue: YooptaContentValue) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newValue))
    },
    { wait: 1000 },
  )

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

  const handleChange = (newValue: YooptaContentValue) => {
    setValue(newValue)
    debouncedSave(newValue)
  }

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
    <div className="flex h-full flex-col px-3 py-3 md:px-6 md:py-4">
      <div className="mb-3 flex items-center justify-between gap-2 md:mb-4">
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-full md:size-9"
            onClick={() => router.history.back()}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-base font-medium whitespace-nowrap md:text-xl">UT模板</h1>
        </div>
        <div className="flex gap-1.5 md:gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs md:h-9 md:px-4 md:text-sm"
            onClick={handleResetTemplate}
          >
            重置
          </Button>
          <Button
            size="sm"
            className="h-8 px-2 text-xs md:h-9 md:px-4 md:text-sm"
            onClick={handleExport}
          >
            导出
          </Button>
        </div>
      </div>
      <div className="prose max-w-none flex-1 overflow-auto rounded-lg border py-3 pr-3 pl-6 prose-neutral md:py-4 md:pr-4 md:pl-12 dark:prose-invert">
        <YooptaEditor
          editor={editor}
          plugins={plugins}
          marks={marks}
          tools={TOOLS}
          value={value}
          onChange={handleChange}
          placeholder="输入内容..."
        />
      </div>
    </div>
  )
}
