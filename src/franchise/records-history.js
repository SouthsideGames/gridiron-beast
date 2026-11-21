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
  const historical = {};
  for (const career of Object.values(f?.preLeagueHistory?.careers || {})) {
    for (const book of career.seasons || []) {
      for (const category of RECORD_CATEGORIES) {
        const value = book.reg?.[category.key];
        if (!Number.isFinite(value) || value <= 0 || value <= (historical[category.id]?.value || 0)) continue;
        historical[category.id] = { value, id: career.id, name: career.name, team: book.team, year: book.year, preLeague: true };
      }
    }
  }
  return [...sections.map(([scope, label, categories]) => ({
    scope, label,
    rows: categories.map((category) => ({
      category: category.id, label: category.label,
      record: copyRecord(saved?.[scope]?.[category.id]),
    })),
  })), ...(f?.preLeagueHistory ? [{
    scope: 'preLeague', label: 'Pre-franchise season records',
    rows: RECORD_CATEGORIES.map(category => ({ category: category.id, label: category.label, record: historical[category.id] || null })),
  }] : [])];
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
