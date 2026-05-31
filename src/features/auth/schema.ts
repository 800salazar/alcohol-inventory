import { z } from 'zod'

export const emailSchema = z.object({
  email: z.string().email('Correo inválido'),
})

export const otpSchema = z.object({
  token: z
    .string()
    .min(6, 'El código tiene 6 dígitos')
    .max(10, 'Código inválido'),
})

export type EmailForm = z.infer<typeof emailSchema>
export type OtpForm = z.infer<typeof otpSchema>
