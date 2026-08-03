import { hashPassword, verifyPassword } from '../src/utils/password'

// Automates password hashing testing.

describe('hashPassword / verifyPassword', () => {
  it('produces a bcrypt-format hash, never the plaintext password', async () => {
    const hash = await hashPassword('Secret123')

    expect(hash).not.toBe('Secret123')
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/)
  })

  it('verifies the correct password against its hash', async () => {
    const hash = await hashPassword('Secret123')

    await expect(verifyPassword('Secret123', hash)).resolves.toBe(true)
  })

  it('rejects an incorrect password against the hash', async () => {
    const hash = await hashPassword('Secret123')

    await expect(verifyPassword('WrongPassword', hash)).resolves.toBe(false)
  })
})
