// Presentation filters depend on recorded event fields, never localized prose.
export function matchLogMatches(entry, filter) {
  if (filter === 'all') return true;
  if (filter === 'scoring') return entry.kind === 'score' || entry.result === 'touchdown' || entry.result === 'safety';
  if (filter === 'turnovers') return ['interception','fumble','touchback_return'].includes(entry.result) || entry.kind === 'turnover';
  if (filter === 'injuries') return entry.kind === 'injury' || entry.kind === 'injury_notice';
  if (filter === 'abilities') return !!entry.ability || ['ability','status','zone'].includes(entry.kind);
  return false;
}
