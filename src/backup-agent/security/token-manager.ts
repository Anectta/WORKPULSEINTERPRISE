import * as crypto from 'node:crypto';

export class TokenManager {
  public static generateSecureToken(byteLength: number = 32): string {
    return crypto.randomBytes(byteLength).toString('hex');
  }

  public static timingSafeVerify(candidate: string, expected: string): boolean {
    if (!candidate || !expected) return false;
    const bufCandidate = Buffer.from(candidate, 'utf-8');
    const bufExpected = Buffer.from(expected, 'utf-8');

    if (bufCandidate.length !== bufExpected.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufCandidate, bufExpected);
  }

  public static signHmacSha256(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }
}
