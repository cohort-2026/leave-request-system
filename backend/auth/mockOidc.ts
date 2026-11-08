export interface MockOidcUser {
  email: string;
  sub: string;
}

export function getMockOidcAuthorizeUrl(issuer: string, clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: "openid email profile",
  });
  return `${issuer}/authorize?${params.toString()}`;
}

export function exchangeMockOidcCodeForUser(code: string): MockOidcUser {
  if (code.startsWith("mock_code_")) {
    const encodedEmail = code.replace("mock_code_", "");
    return {
      email: encodedEmail,
      sub: `mock_sub_${Buffer.from(encodedEmail).toString("hex")}`,
    };
  }
  throw new Error("Invalid OIDC mock code specification");
}
