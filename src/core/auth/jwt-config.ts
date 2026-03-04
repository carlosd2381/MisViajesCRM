export interface JwtConfig {
  issuer: string;
  audience: string;
  defaultKid: string;
  keyring: Record<string, string>;
}

function parseKeyPair(pair: string): [string, string] | null {
  const [kid, secret] = pair.split(':');
  if (!kid || !secret) return null;
  return [kid.trim(), secret.trim()];
}

function parseEnvKeyring(raw?: string): Record<string, string> {
  if (!raw?.trim()) return {};

  const output: Record<string, string> = {};
  for (const pair of raw.split(',')) {
    const parsed = parseKeyPair(pair.trim());
    if (parsed) output[parsed[0]] = parsed[1];
  }

  return output;
}

export function getJwtConfig(): JwtConfig {
  const defaultKid = process.env.AUTH_JWT_DEFAULT_KID ?? 'v1';
  const defaultSecret = process.env.AUTH_TOKEN_SECRET ?? 'dev-secret-change-me';
  const envKeyring = parseEnvKeyring(process.env.AUTH_JWT_KEYS);

  return {
    issuer: process.env.AUTH_JWT_ISSUER ?? 'misviajescrm.local',
    audience: process.env.AUTH_JWT_AUDIENCE ?? 'misviajescrm.api',
    defaultKid,
    keyring: {
      [defaultKid]: defaultSecret,
      ...envKeyring
    }
  };
}
