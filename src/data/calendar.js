// The league calendar (GDD §19.5). Seasons are stored as 1, 2, 3… inside a
// franchise; everywhere the player reads them they are league years, so
// stats, contracts and draft picks read "1202 R2" rather than "S2 R2". The
// epoch is invented on purpose: real years would make the league feel like
// a real one.
export const EPOCH = 1200;
export const yearOf = (season) => EPOCH + Number(season || 0);
/** Season index from a league year (the inverse). */
export const seasonOf = (year) => Number(year) - EPOCH;
/** "the 1201 season", "the 1202 class", a plain label with no "S" prefix. */
export const yearLabel = (season) => String(yearOf(season));
