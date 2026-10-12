// THE PARAGON BRAND LIST — exactly these, with their codes (operator ruling,
// 12 October 2026). One list: every surface that offers or columns a brand
// reads it, so two pages cannot disagree about which brands exist.
// `paragonBrands.test.ts` holds the list to the ruling and both pages to the list.
export const PARAGON_BRANDS = Object.freeze([
  { code: 'WARDAH', name: 'Wardah' },
  { code: 'EMINA', name: 'Emina' },
  { code: 'MAKE-OVER', name: 'Make Over' },
  { code: 'INSTAPERFECT', name: 'Instaperfect' },
  { code: 'KAHF', name: 'Kahf' },
  { code: 'PUTRI', name: 'Putri' },
  { code: 'CRYSTALLURE', name: 'Crystallure' },
  { code: 'LABORE', name: 'Labore' },
  { code: 'BIODEF', name: 'Biodef' },
  { code: 'TAVI', name: 'Tavi' },
  { code: 'WONDERLY', name: 'Wonderly' },
  { code: 'OMG', name: 'OMG' },
  { code: 'BEYONDLY', name: 'Beyondly' },
  { code: 'EARTH-LOVE-LIFE', name: 'Earth Love Life' },
] as const);

export type ParagonBrandCode = (typeof PARAGON_BRANDS)[number]['code'];
export type ParagonBrandName = (typeof PARAGON_BRANDS)[number]['name'];

/** The names, in the ruled order — what a chip or a column heading shows. */
export const PARAGON_BRAND_NAMES: readonly ParagonBrandName[] = Object.freeze(
  PARAGON_BRANDS.map((b) => b.name),
);
