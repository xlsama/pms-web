import { useEffect, useMemo, useRef, useState } from 'react'
import { useDebounceFn } from 'ahooks'
import { createFileRoute } from '@tanstack/react-router'
import YooptaEditor, { createYooptaEditor, type YooptaContentValue } from '@yoopta/editor'
import Paragraph from '@yoopta/paragraph'
import { HeadingTwo, HeadingThree } from '@yoopta/headings'
import { BulletedList, NumberedList } from '@yoopta/lists'
import Code from '@yoopta/code'
import Divider from '@yoopta/divider'
import Image from '@yoopta/image'
import Table from '@yoopta/table'
import Link from '@yoopta/link'
import Accordion from '@yoopta/accordion'
import { Bold, Italic, CodeMark } from '@yoopta/marks'
import { markdown } from '@yoopta/exports'
import ActionMenuList, { DefaultActionMenuRender } from '@yoopta/action-menu-list'
import Toolbar, { DefaultToolbarRender } from '@yoopta/toolbar'
import LinkTool, { DefaultLinkToolRender } from '@yoopta/link-tool'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const plugins: any[] = [
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
    <div className="flex h-full flex-col px-6 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => router.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-medium">UT模板</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetTemplate}>
            重置模板
          </Button>
          <Button onClick={handleExport}>导出 Markdown</Button>
        </div>
      </div>
      <div className="prose max-w-none flex-1 overflow-auto rounded-lg border py-4 pr-4 pl-12 prose-neutral dark:prose-invert">
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
