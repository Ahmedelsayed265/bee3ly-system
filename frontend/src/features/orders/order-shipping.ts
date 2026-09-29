import { governorateLabel } from '@/features/settings/governorates';

export function parseShippingAddressFromNotes(
  notes: string | null | undefined,
) {
  if (!notes?.trim()) return null;
  for (const part of notes.split(' | ')) {
    const trimmed = part.trim();
    if (trimmed.startsWith('العنوان:')) {
      const value = trimmed.slice('العنوان:'.length).trim();
      return value || null;
    }
  }
  return null;
}

export function formatOrderShippingAddress(
  input: {
    governorate?: string | null;
    notes?: string | null;
  },
  locale: string,
) {
  const parts: string[] = [];
  if (input.governorate?.trim()) {
    parts.push(governorateLabel(input.governorate.trim(), locale));
  }
  const street = parseShippingAddressFromNotes(input.notes ?? null);
  if (street) parts.push(street);
  return parts.length ? parts.join(' — ') : null;
}
