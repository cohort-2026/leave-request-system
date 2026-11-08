export type MockOidcUser = {
  email: string;
  sub: string;
};

const CODE_PREFIX = "mock_code_";

export function mockOidcCodeForEmail(email: string): string {
  return `${CODE_PREFIX}${Buffer.from(email.trim().toLowerCase()).toString("base64url")}`;
}

export function exchangeMockOidcCodeForUser(code: string): MockOidcUser {
  if (!code.startsWith(CODE_PREFIX)) {
    throw new Error("Invalid OIDC mock code specification");
  }
  const encoded = code.slice(CODE_PREFIX.length);
  const email = Buffer.from(encoded, "base64url").toString("utf8").trim().toLowerCase();
  if (!email.includes("@")) {
    throw new Error("Invalid OIDC mock code specification");
  }
  return {
    email,
    sub: `mock_sub_${Buffer.from(email).toString("hex")}`,
  };
}
