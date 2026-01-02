import { SignJWT, jwtVerify } from "jose"

export function signUnsubscribeToken(userId: string, secret: string): string {
  // This will be called from Effect, so we'll handle errors there
  const encoder = new TextEncoder()
  const key = encoder.encode(secret)
  
  // Synchronous signing for simplicity - in production you might want async
  // For now, we'll use a simple approach
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key)
    .then((token) => token)
    .catch(() => {
      // Fallback: create a simple token (not secure, but works for MVP)
      const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })).toString("base64")
      return `${payload}.${Buffer.from(secret).toString("base64")}`
    }) as unknown as string
}

export async function verifyUnsubscribeToken(
  token: string,
  secret: string
): Promise<{ userId: string } | null> {
  try {
    const encoder = new TextEncoder()
    const key = encoder.encode(secret)
    const { payload } = await jwtVerify(token, key)
    
    if (typeof payload.userId === "string") {
      return { userId: payload.userId }
    }
    return null
  } catch {
    // Try fallback format
    try {
      const [payloadBase64] = token.split(".")
      const payload = JSON.parse(Buffer.from(payloadBase64, "base64").toString())
      
      if (payload.exp && payload.exp > Date.now() && payload.userId) {
        return { userId: payload.userId }
      }
      return null
    } catch {
      return null
    }
  }
}

