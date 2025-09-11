import { NextResponse } from 'next/server'

// Simple in-memory store for dev. Consider Redis in prod.
const otpStore = globalThis as unknown as { __otp?: Record<string, { code: string; expiresAt: number }> }
otpStore.__otp ||= {}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: Request) {
  try {
    const { phone } = await req.json()
    if (!phone) return NextResponse.json({ message: 'phone requerido' }, { status: 400 })

    const code = generateCode()
    const expiresAt = Date.now() + 5 * 60 * 1000
    otpStore.__otp![phone] = { code, expiresAt }

    // If WhatsApp (Meta) creds exist, attempt to send
    const token = process.env.META_WHATSAPP_TOKEN
    const fromPhoneId = process.env.META_WHATSAPP_FROM_PHONE_ID
    if (token && fromPhoneId) {
      try {
        await fetch(`https://graph.facebook.com/v20.0/${fromPhoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone.replace('+', ''),
            type: 'template',
            template: {
              name: 'otp_code',
              language: { code: 'en' },
              components: [
                {
                  type: 'body',
                  parameters: [{ type: 'text', text: code }]
                }
              ]
            }
          })
        })
      } catch {
        // Fallback silent; code stored regardless
      }
    }

    // In dev (no Meta creds), return code so user can proceed
    const isDev = !token || !fromPhoneId
    return NextResponse.json({ ok: true, devCode: isDev ? code : undefined })
  } catch {
    return NextResponse.json({ message: 'Error interno' }, { status: 500 })
  }
}


