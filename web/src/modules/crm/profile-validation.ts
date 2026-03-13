import type { ClientContact, ClientProfileForm, RepeatEmail, RepeatPhone } from './types';

interface ValidateProfileInput {
  profile: ClientProfileForm;
  phones: RepeatPhone[];
  emails: RepeatEmail[];
  translate: (path: string) => string;
}

export function validateClientProfile({ profile, phones, emails, translate }: ValidateProfileInput): {
  errors: string[];
  normalizedContacts: ClientContact[];
} {
  const errors: string[] = [];

  if (!profile.firstName.trim()) errors.push(translate('validation.firstNameRequired'));
  if (!profile.paternalLastName.trim()) errors.push(translate('validation.paternalLastNameRequired'));

  const normalizedContacts: ClientContact[] = [
    ...phones.filter((item) => item.value.trim()).map((item) => ({ type: item.type, value: item.value.trim() })),
    ...emails.filter((item) => item.value.trim()).map((item) => ({ type: 'email' as const, value: item.value.trim() })),
  ];

  if (normalizedContacts.length === 0) errors.push(translate('validation.contactRequired'));

  const hasPhone = normalizedContacts.some((item) => item.type !== 'email');
  const hasEmail = normalizedContacts.some((item) => item.type === 'email');

  if (profile.preferredContactMethod === 'email' && !hasEmail) errors.push(translate('validation.preferredEmailMissing'));
  if (['phone', 'sms', 'whatsapp'].includes(profile.preferredContactMethod) && !hasPhone) {
    errors.push(translate('validation.preferredPhoneMissing'));
  }

  return { errors, normalizedContacts };
}
