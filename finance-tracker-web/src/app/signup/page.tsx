"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CountryCodeSelector } from "@/components/ui/country-code-selector"
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from "next/link"
import { countries, Country } from "@/lib/countries"

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0])
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'credentials' | 'verify_otp'>('credentials')
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState<number>(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const getFullPhone = () => `${selectedCountry.dial_code}${phone}`

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const supabase = createClient()

    const fullPhone = getFullPhone()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      phone: fullPhone,
      options: {
        data: {
          telefono: fullPhone
        }
      }
    })

    if (error) {
      setError(error.message)
    } else {
      if (data.user?.identities?.length === 0) {
        setError("Ya existe un usuario con este número de teléfono.")
        return
      }
      setSuccess("Te hemos enviado un código de verificación a tu teléfono.")
      setStep('verify_otp')
      setResendCooldown(60)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const supabase = createClient()
    const fullPhone = getFullPhone()

    const { error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: otp,
      type: 'sms'
    })

    if (error) {
      setError("Código de verificación incorrecto o expirado. Por favor, intenta de nuevo.")
    } else {
      // Mirror phone verification status into profiles table for bot enforcement
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ phone_verified: true, telefono: fullPhone }).eq('id', user.id)
      }
      router.push('/login')
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError(null)
    const supabase = createClient()
    const fullPhone = getFullPhone()

    const { error } = await supabase.auth.resend({
      type: 'sms',
      phone: fullPhone,
    })

    if (error) {
      setError("No pudimos reenviar el código en este momento. Intenta en unos segundos.")
    } else {
      setSuccess("Código reenviado. Revisa tus mensajes.")
      setResendCooldown(60)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            {step === 'credentials' ? 'Crear una cuenta' : 'Verificar tu teléfono'}
          </CardTitle>
          <CardDescription>
            {step === 'credentials'
              ? 'Ingresa tu información para registrarte.'
              : 'Ingresa el código de 6 dígitos que te enviamos.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'credentials' ? (
            <form onSubmit={handleSignup}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input id="email" type="email" placeholder="tu@correo.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="telefono">Teléfono (WhatsApp)</Label>
                  <div className="flex gap-2">
                    <CountryCodeSelector selectedCountry={selectedCountry} setSelectedCountry={setSelectedCountry} />
                    <Input id="telefono" type="tel" placeholder="987654321" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                {success && <p className="text-green-600 text-sm">{success}</p>}
                <Button type="submit" className="w-full">Crear cuenta</Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="otp">Código de Verificación</Label>
                  <Input id="otp" type="text" required value={otp} onChange={(e) => setOtp(e.target.value)} />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                {success && <p className="text-green-600 text-sm">{success}</p>}
                <div className="flex items-center justify-between gap-3">
                  <Button type="submit" className="w-full">Verificar</Button>
                </div>
                <div className="mt-2 text-center text-sm">
                  <button type="button" onClick={handleResend} disabled={resendCooldown > 0} className="underline disabled:opacity-50">
                    {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código'}
                  </button>
                </div>
              </div>
            </form>
          )}
          
          <div className="mt-4 text-center text-sm">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="underline">
              Iniciar sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

