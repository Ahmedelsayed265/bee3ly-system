const FOOD_VENUE_TYPES = new Set(['RESTAURANT', 'CAFE']);

export function businessIsFoodVenue(type: string): boolean {
  return FOOD_VENUE_TYPES.has(type);
}
