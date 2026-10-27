import { createHash, randomBytes } from 'node:crypto'

/** A fresh connector secret: 32 random bytes as base64url (43 characters). Shown to the user once. */
export function newConnectorToken(): string {
  return randomBytes(32).toString('base64url')
}

/** What we store instead of the token. Same as Postgres encode(extensions.digest(token, 'sha256'), 'hex'). */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
