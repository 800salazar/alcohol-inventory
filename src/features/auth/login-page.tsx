import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Loader2, Wine } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from './auth-provider'
import { emailSchema, otpSchema, type EmailForm, type OtpForm } from './schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function LoginPage() {
  const { session, loading: authLoading, sendOtp, verifyOtp } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/'

  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })
  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: { token: '' },
  })

  // Si ya hay sesión, salimos del login.
  if (!authLoading && session) return <Navigate to={from} replace />

  const onSendCode = async (values: EmailForm) => {
    try {
      await sendOtp(values.email)
      setEmail(values.email)
      setStep('code')
      toast.success('Te enviamos un código a tu correo')
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'No se pudo enviar el código. ¿El usuario está dado de alta?',
      )
    }
  }

  const onVerify = async (values: OtpForm) => {
    try {
      await verifyOtp(email, values.token)
      toast.success('Bienvenido')
      // La redirección la maneja el guard al detectar la sesión.
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Código inválido o expirado',
      )
    }
  }

  const resend = async () => {
    try {
      await sendOtp(email)
      toast.success('Código reenviado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo reenviar')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wine className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Inventario Licor</CardTitle>
          <CardDescription>
            {step === 'email'
              ? 'Ingresa tu correo para recibir un código'
              : `Escribe el código enviado a ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <form
              onSubmit={emailForm.handleSubmit(onSendCode)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@bar.com"
                  {...emailForm.register('email')}
                />
                {emailForm.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={emailForm.formState.isSubmitting}
              >
                {emailForm.formState.isSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Enviar código
              </Button>
            </form>
          ) : (
            <form onSubmit={otpForm.handleSubmit(onVerify)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">Código de 6 dígitos</Label>
                <Input
                  id="token"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="text-center text-lg tracking-[0.5em]"
                  {...otpForm.register('token')}
                />
                {otpForm.formState.errors.token && (
                  <p className="text-xs text-destructive">
                    {otpForm.formState.errors.token.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={otpForm.formState.isSubmitting}
              >
                {otpForm.formState.isSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Entrar
              </Button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email')
                    otpForm.reset()
                  }}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Cambiar correo
                </button>
                <button
                  type="button"
                  onClick={resend}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Reenviar código
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
