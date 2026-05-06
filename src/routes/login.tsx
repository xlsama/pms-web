import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Eye, EyeOff } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'

import { login } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useAuthStore } from '@/stores/auth'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    const token = useAuthStore.getState().token
    if (token) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

const loginSchema = z.object({
  loginName: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const loginPageRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const setAuth = useAuthStore(state => state.setAuth)

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: res => {
      const { token, data } = res
      setAuth(token, data)
      navigate({ to: '/' })
    },
  })

  const form = useForm({
    defaultValues: {
      loginName: '',
      password: '',
    },
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: ({ value }) => {
      loginMutation.mutate(value)
    },
  })

  useEffect(() => {
    const blurRestoredLoginFocus = () => {
      const activeElement = document.activeElement
      if (
        activeElement instanceof HTMLElement &&
        loginPageRef.current?.contains(activeElement) &&
        activeElement.matches('input, textarea, select, button')
      ) {
        activeElement.blur()
      }
    }

    blurRestoredLoginFocus()
    const timeoutId = window.setTimeout(blurRestoredLoginFocus, 120)

    return () => window.clearTimeout(timeoutId)
  }, [])

  return (
    <div
      ref={loginPageRef}
      className="login-page-bg flex min-h-dvh flex-col items-center justify-center px-4 pt-4 pb-[calc(1rem+8dvh)] md:pb-[calc(1rem+10dvh)]"
    >
      <div className="login-company-mark" aria-label="Yechtech">
        Yechtech
      </div>
      <div className="flex w-full max-w-sm flex-col items-center">
        <div className="mb-8 w-full text-center">
          <h1 className="login-brand text-balance" aria-label="Yechtech PMS">
            <span className="login-brand__product">PMS</span>
          </h1>
          <p className="login-brand__subtitle text-pretty">UT Work Hour Management</p>
        </div>
        <Card className="w-full bg-white/95 text-slate-950 shadow-md ring-[0.5px] shadow-black/5 ring-foreground/5 backdrop-blur-md dark:bg-white/95 dark:text-slate-950">
          <CardContent className="pt-6">
            <form
              onSubmit={e => {
                e.preventDefault()
                form.handleSubmit()
              }}
            >
              <FieldGroup>
                <form.Field
                  name="loginName"
                  children={field => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>用户名</FieldLabel>
                        <Input
                          id={field.name}
                          type="text"
                          placeholder="请输入用户名"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={e => field.handleChange(e.target.value)}
                          autoComplete="username"
                          aria-invalid={isInvalid}
                          className="login-input text-slate-950 placeholder:text-slate-500 dark:text-slate-950 dark:placeholder:text-slate-500"
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    )
                  }}
                />

                <form.Field
                  name="password"
                  children={field => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>密码</FieldLabel>
                        <div className="relative">
                          <Input
                            id={field.name}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="请输入密码"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={e => field.handleChange(e.target.value)}
                            autoComplete="current-password"
                            aria-invalid={isInvalid}
                            className="login-input pr-9 text-slate-950 placeholder:text-slate-500 dark:text-slate-950 dark:placeholder:text-slate-500"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute top-1/2 right-1 size-6 -translate-y-1/2 text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-700 dark:hover:bg-slate-100 dark:hover:text-slate-950"
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
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    )
                  }}
                />

                <Button
                  type="submit"
                  className="w-full bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Spinner />
                      登录中...
                    </>
                  ) : (
                    '登录'
                  )}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
