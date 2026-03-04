export function smokeHeaders(locale, userId, role, contentType = 'application/json') {
  return {
    'content-type': contentType,
    'x-user-id': userId,
    'x-user-role': role,
    'x-locale': locale
  };
}

export async function issueSmokeTokenPair({
  request,
  locale,
  userId,
  role,
  context = 'token issue'
}) {
  const response = await request('/auth/token', {
    method: 'POST',
    headers: smokeHeaders(locale, userId, role)
  });

  if (response.status !== 200) {
    const body = await response.text();
    throw new Error(`${context} failed: expected 200, got ${response.status}. Body: ${body}`);
  }

  const payload = await response.json();
  const accessToken = payload?.data?.accessToken;
  const refreshToken = payload?.data?.refreshToken;

  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new Error(`${context} failed: accessToken missing`);
  }

  if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
    throw new Error(`${context} failed: refreshToken missing`);
  }

  return { accessToken, refreshToken };
}

export async function resolveSmokeAuthHeaders({
  authMode,
  request,
  locale,
  userId,
  role,
  context = 'auth headers'
}) {
  if (authMode !== 'token') {
    return smokeHeaders(locale, userId, role);
  }

  const { accessToken } = await issueSmokeTokenPair({
    request,
    locale,
    userId,
    role,
    context
  });

  return {
    authorization: `Bearer ${accessToken}`,
    'content-type': 'application/json',
    'x-locale': locale
  };
}
