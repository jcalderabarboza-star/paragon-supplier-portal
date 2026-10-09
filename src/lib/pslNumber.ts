/**
 * How a preferred-supplier listing's number READS: `PSL-008`, like every other
 * document number in the portal (operator ruling, 9 October 2026).
 *
 * The stored id stays `psl-008` — it keys the ledger, the routes and the test
 * ids. Only the display is upper-cased, and only here.
 */
export const pslNumber = (id: string): string => id.toUpperCase();
