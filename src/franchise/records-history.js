// Task 9: read-only records presentation model. The existing stats engine
// remains the sole writer of records; no gameplay calculations are changed.
import { RECORD_CATEGORIES, TEAM_RECORDS } from './stats.js';
import { archiveRecords } from './preleague-history.js';

const sections = Object.freeze([
  ['game', 'Single game', RECORD_CATEGORIES],
  ['season', 'Single season', RECORD_CATEGORIES],
  ['team', 'Team game', TEAM_RECORDS],
]);

function copyRecord(record) {
  if (!record || !Number.isFinite(record.value)) return null;
  const { prev, ...current } = record;
  return {
    ...current,
    previous: prev && Number.isFinite(prev.value)
      ? { ...prev, previous: null } : null,
  };
}

/** The current standing record for each supported category, with its previous holder. Only what this franchise has played. */
export function historicalRecords(f) {
  const saved = f?.records || {};
  return sections.map(([scope, label, categories]) => ({
    scope, label,
    rows: categories.map((category) => ({
      category: category.id, label: category.label,
      record: copyRecord(saved?.[scope]?.[category.id]),
    })),
  }));
}

/**
 * The league's marks from before the owner arrived (the pre-franchise archive, preleague-history.js): the best single season and
 * the best career total in each category. They are a separate book: a playable record is set and broken without reference to
 * them, so nothing here changes the record book, League News or a GM's record count. Empty when the save has no archive.
 */
export function preLeagueRecords(f) {
  const book = archiveRecords(f); if (!book) return [];
  const rows = (set) => RECORD_CATEGORIES.map((category) => ({ category: category.id, label: category.label, record: set[category.id] ? { ...set[category.id] } : null }));
  return [{ scope: 'preSeason', label: 'Single season', rows: rows(book.season) }, { scope: 'preCareer', label: 'Career', rows: rows(book.career) }];
}

/** Find all current standing records credited to a monster's stable ID (the record book first, then the archive's marks). */
export function monsterRecordHonours(f, id) {
  if (id == null) return [];
  return [...historicalRecords(f), ...preLeagueRecords(f)].flatMap((section) =>
    section.rows.filter((row) => row.record?.id != null &&
      String(row.record.id) === String(id))
      .map((row) => ({ scope: section.scope, category: row.category,
        label: row.label, ...row.record })));
}
