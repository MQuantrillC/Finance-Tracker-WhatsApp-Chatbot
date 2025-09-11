import { NextResponse } from 'next/server'

const otpStore = globalThis as unknown as { __otp?: Record<string, { code: string; expiresAt: number }> }
otpStore.__otp ||= {}

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json()
    if (!phone || !code) return NextResponse.json({ message: 'phone y code requeridos' }, { status: 400 })

    const entry = otpStore.__otp![phone]
    if (!entry) return NextResponse.json({ message: 'Código no encontrado' }, { status: 400 })
    if (Date.now() > entry.expiresAt) return NextResponse.json({ message: 'Código expirado' }, { status: 400 })
    if (entry.code !== code) return NextResponse.json({ message: 'Código inválido' }, { status: 400 })

    delete otpStore.__otp![phone]
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ message: 'Error interno' }, { status: 500 })
  }
}







