// A failed lookup must not turn a conflicting import into an unchecked save.
export async function checkStoreReplacement(brandName) {
  if (!String(brandName || '').trim()) return null;
  var response = await fetch('/api/stores?checkBrand=' + encodeURIComponent(brandName));
  var result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Vorhandene Stores konnten nicht geprüft werden. Bitte erneut versuchen.');
  return result.existingStore || null;
}
