import { governorateLabel } from '@/features/settings/governorates';

function parseNoteField(
  notes: string | null | undefined,
  prefix: string,
): string | null {
  if (!notes?.trim()) return null;
  for (const part of notes.split(' | ')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      const value = trimmed.slice(prefix.length).trim();
      return value || null;
    }
  }
  return null;
}

export function parseShippingAddressFromNotes(
  notes: string | null | undefined,
) {
  return parseNoteField(notes, 'العنوان:');
}

export function parseDeliveryAreaFromNotes(notes: string | null | undefined) {
  return parseNoteField(notes, 'المنطقة:');
}

export function formatOrderShippingAddress(
  input: {
    governorate?: string | null;
    notes?: string | null;
  },
  locale: string,
) {
  const parts: string[] = [];
  const area = parseDeliveryAreaFromNotes(input.notes ?? null);
  if (area) parts.push(area);
  if (input.governorate?.trim()) {
    parts.push(governorateLabel(input.governorate.trim(), locale));
  }
  const street = parseShippingAddressFromNotes(input.notes ?? null);
  if (street) parts.push(street);
  return parts.length ? parts.join(' — ') : null;
}
