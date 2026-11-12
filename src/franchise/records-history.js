// Task 9: read-only records presentation model. The existing stats engine
// remains the sole writer of records; no gameplay calculations are changed.
import { RECORD_CATEGORIES, TEAM_RECORDS } from './stats.js';

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

/** The current standing record for each supported category, with its previous holder. */
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

/** Find all current standing records credited to a monster's stable ID. */
export function monsterRecordHonours(f, id) {
  if (id == null) return [];
  return historicalRecords(f).flatMap((section) =>
    section.rows.filter((row) => row.record?.id != null &&
      String(row.record.id) === String(id))
      .map((row) => ({ scope: section.scope, category: row.category,
        label: row.label, ...row.record })));
}
