import { z } from 'zod'

export const OTP_LENGTH = 8

export const emailSchema = z.object({
  email: z.string().email('Correo inválido'),
})

export const otpSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^\d{8}$/, `El código debe tener ${OTP_LENGTH} dígitos`),
})

export type EmailForm = z.infer<typeof emailSchema>
export type OtpForm = z.infer<typeof otpSchema>
