import { createHash, randomBytes } from "node:crypto";

export function hashOnboardingToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newOnboardingToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashOnboardingToken(token) };
}
