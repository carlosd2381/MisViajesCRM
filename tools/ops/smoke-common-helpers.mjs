export function smokeAssert(condition, message) {
  if (!condition) throw new Error(message);
}

export function smokeExpectedMessage(locale, spanish, english) {
  return locale === 'en-US' ? english : spanish;
}

export async function smokeExpectStatus(name, response, status) {
  if (response.status !== status) {
    const text = await response.text();
    throw new Error(`${name} failed: expected ${status}, got ${response.status}. Body: ${text}`);
  }
}

export async function smokeExpectLocalizedMessage(name, response, locale, spanish, english) {
  const payload = await response.json();
  const expected = smokeExpectedMessage(locale, spanish, english);
  if (payload?.message !== expected) {
    throw new Error(`${name} failed: expected message "${expected}", got "${payload?.message ?? ''}"`);
  }
}
