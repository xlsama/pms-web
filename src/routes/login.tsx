import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { login } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { Spinner } from '@/components/ui/spinner'

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

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted p-4">
      <h1 className="mb-8 text-3xl font-bold text-balance">Yechtech PMS</h1>
      <Card className="w-full max-w-sm">
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
                        aria-invalid={isInvalid}
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
                          aria-invalid={isInvalid}
                          className="pr-9"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute top-1/2 right-1 size-6 -translate-y-1/2"
                          aria-label={showPassword ? '隐藏密码' : '显示密码'}
                        >
                          {showPassword ? (
                            <Eye className="size-3.5" />
                          ) : (
                            <EyeOff className="size-3.5" />
                          )}
                        </Button>
                      </div>
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  )
                }}
              />

              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
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
  )
}
