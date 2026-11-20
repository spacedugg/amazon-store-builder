export function normaliseDesignReferences(value) {
  return Array.isArray(value) ? value.filter(row => row && typeof row.url === 'string').map(row => ({ url: row.url.trim(), notes: typeof row.notes === 'string' ? row.notes : '' })) : [];
}
export function designReferenceError(rows = []) {
  for (const row of rows) {
    if (!row.url?.trim() && !row.notes?.trim()) continue;
    try {
      const url = new URL(row.url);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw Error();
    } catch { return 'Bitte einen gültigen Website-Link zur Designrichtung eintragen.'; }
  }
  return '';
}
export function designDirectionData(rows, useReferences) {
  if (useReferences && !rows.some(row => row.url?.trim())) throw Error('Bitte eine Stilreferenz auswählen oder ohne Stilreferenz fortfahren.');
  const error = useReferences && designReferenceError(rows);
  if (error) throw Error(error);
  return { designDirectionReviewed: true, designReferences: useReferences ? rows.filter(row => row.url?.trim()).map(row => ({ url: row.url.trim(), notes: (row.notes || '').trim() })) : [] };
}
