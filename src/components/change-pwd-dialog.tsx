import { useForm, useStore } from '@tanstack/react-form'
import { Eye, EyeOff } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { z } from 'zod'

import { changePwd } from '@/api/auth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

import { Spinner } from './ui/spinner'

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
  trigger?: React.ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ChangePwdDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ChangePwdDialogProps) {
  const isMobile = useIsMobile()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = isControlled ? onOpenChange! : setUncontrolledOpen

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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

  const isSubmitting = useStore(form.store, state => state.isSubmitting)

  const formBody = (
    <form
      onSubmit={e => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field name="password">
          {field => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>新密码</FieldLabel>
                <div className="relative">
                  <Input
                    id={field.name}
                    type={showPassword ? 'text' : 'password'}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={e => field.handleChange(e.target.value)}
                    autoComplete="new-password"
                    aria-invalid={isInvalid}
                    className="pr-9"
                  />
                  <div className="absolute inset-y-0 right-1 flex items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="size-6"
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    >
                      <AnimatePresence initial={false} mode="popLayout">
                        <motion.span
                          key={showPassword ? 'eye' : 'eye-off'}
                          initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
                          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
                          transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                          className="inline-flex"
                        >
                          {showPassword ? (
                            <Eye className="size-3.5" />
                          ) : (
                            <EyeOff className="size-3.5" />
                          )}
                        </motion.span>
                      </AnimatePresence>
                    </Button>
                  </div>
                </div>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <form.Field name="confirmPassword">
          {field => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>请再次输入新密码</FieldLabel>
                <div className="relative">
                  <Input
                    id={field.name}
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={e => field.handleChange(e.target.value)}
                    autoComplete="new-password"
                    aria-invalid={isInvalid}
                    className="pr-9"
                  />
                  <div className="absolute inset-y-0 right-1 flex items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="size-6"
                      aria-label={showConfirmPassword ? '隐藏密码' : '显示密码'}
                    >
                      <AnimatePresence initial={false} mode="popLayout">
                        <motion.span
                          key={showConfirmPassword ? 'eye' : 'eye-off'}
                          initial={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
                          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, scale: 0.25, filter: 'blur(4px)' }}
                          transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                          className="inline-flex"
                        >
                          {showConfirmPassword ? (
                            <Eye className="size-3.5" />
                          ) : (
                            <EyeOff className="size-3.5" />
                          )}
                        </motion.span>
                      </AnimatePresence>
                    </Button>
                  </div>
                </div>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>

        <div className={cn('flex', isMobile ? 'mt-2' : 'justify-end')}>
          <Button type="submit" disabled={isSubmitting} className={cn(isMobile && 'w-full')}>
            {isSubmitting ? (
              <>
                <Spinner />
                提交中...
              </>
            ) : (
              '提交'
            )}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>修改密码</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{formBody}</div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>修改密码</DialogTitle>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  )
}
