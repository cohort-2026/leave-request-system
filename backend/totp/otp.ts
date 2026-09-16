import { Secret, TOTP } from "otpauth";
import { renderSVG } from "uqr";

export const TOTP_ISSUER = "Leave Request System";
export const TOTP_PERIOD_SEC = 30;
export const TOTP_WINDOW = 1;

export function newTotpSecret(): string {
  return new Secret({ size: 20 }).base32;
}

function totpFor(email: string, secretBase32: string): TOTP {
  return new TOTP({
    issuer: TOTP_ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: TOTP_PERIOD_SEC,
    secret: Secret.fromBase32(secretBase32),
  });
}

export function otpauthUrl(email: string, secretBase32: string): string {
  return totpFor(email, secretBase32).toString();
}

export function qrSvgForUrl(url: string): string {
  return renderSVG(url, { ecc: "M", border: 2, pixelSize: 6 });
}

export function normalizeTotpCode(value: string): string | null {
  const digits = value.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(digits)) {
    return null;
  }
  return digits;
}

export function verifyTotpCode(
  email: string,
  secretBase32: string,
  code: string,
): number | null {
  return totpFor(email, secretBase32).validate({
    token: code,
    window: TOTP_WINDOW,
  });
}

export function stepForDelta(delta: number): number {
  return Math.floor(Date.now() / 1000 / TOTP_PERIOD_SEC) + delta;
}
