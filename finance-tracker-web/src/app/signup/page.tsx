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
import { useState } from 'react'
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

  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    
    const fullPhone = `${selectedCountry.dial_code}${phone}`

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
        setError("Ya existe un usuario con este número de teléfono.");
        return;
      }
      setSuccess("Te hemos enviado un código de verificación a tu teléfono.")
      setStep('verify_otp');
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    const fullPhone = `${selectedCountry.dial_code}${phone}`

    const { error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: otp,
      type: 'sms'
    })

    if (error) {
      setError("Código de verificación incorrecto. Por favor, intenta de nuevo.")
    } else {
      router.push('/login');
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
                <Button type="submit" className="w-full">Verificar</Button>
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

