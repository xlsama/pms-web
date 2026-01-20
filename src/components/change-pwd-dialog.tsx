import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changePwd } from '@/api/auth'

const schema = z
  .object({
    password: z.string().min(1, '请输入新密码'),
    confirmPassword: z.string().min(1, '请再次输入新密码'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  })

interface ChangePwdDialogProps {
  trigger?: React.ReactNode
}

export function ChangePwdDialog({ trigger }: ChangePwdDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    validators: {
      onSubmit: schema,
    },
    onSubmit: async ({ value }) => {
      await changePwd(value.password)
      setOpen(false)
      form.reset()
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline">修改密码</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>修改密码</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={e => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-4"
        >
          <form.Field name="password">
            {field => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>
                  新密码 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={field.name}
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-500">{field.state.meta.errors.join(', ')}</p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="confirmPassword">
            {field => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>
                  请再次输入新密码 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={field.name}
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-500">{field.state.meta.errors.join(', ')}</p>
                )}
              </div>
            )}
          </form.Field>

          <div className="flex justify-end">
            <form.Subscribe selector={state => state.isSubmitting}>
              {isSubmitting => (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? '提交中...' : '提交'}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
