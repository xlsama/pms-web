import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore(state => state.setAuth)

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: res => {
      const { token, ...user } = res.data
      setAuth(token, user)
      void navigate({ to: '/' })
    },
  })

  const form = useForm({
    defaultValues: {
      username: '',
      password: '',
    },
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: ({ value }) => {
      loginMutation.mutate({ username: value.username, password: value.password })
    },
  })

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat p-4"
      style={{ backgroundImage: `url(${import.meta.env.BASE_URL}login_bg.png)` }}
    >
      <Card className="w-full max-w-sm border-white/10 bg-black/40 text-white backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-center gap-3">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo" className="size-10" />
          <span className="text-xl font-semibold tracking-widest">STARBUCKS</span>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={e => {
              e.preventDefault()
              void form.handleSubmit()
            }}
          >
            <FieldGroup>
              <form.Field
                name="username"
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
                  '登 录'
                )}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
