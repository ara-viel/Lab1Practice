// Minimal data fetch service stub
// Exports `preloadData` used by components. Returns empty array or the provided data.
export async function preloadData(source) {
  // If `source` is an array or object, return it directly.
  if (Array.isArray(source)) return source;
  if (source && typeof source === 'object') return source;

  // Otherwise attempt a fetch when a URL-like string is provided
  if (typeof source === 'string' && source.trim() !== '') {
    try {
      const res = await fetch(source);
      if (!res.ok) return [];
      const json = await res.json();
      return json;
    } catch (e) {
      return [];
    }
  }

  // Default fallback
  return [];
}
