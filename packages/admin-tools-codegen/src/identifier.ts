/**
 * Produces a stable ECMAScript identifier fragment for exports and template `input.*` access.
 * OpenAPI parameter names are usually already valid (`course_id`).
 */
export function toIdentifierFragment(raw: string): string {
  const replaced = raw.replace(/[^a-zA-Z0-9_$]/gu, "_");
  const withLeading = /^[0-9]/u.test(replaced) ? `_${replaced}` : replaced;
  return withLeading.length > 0 ? withLeading : "_param";
}
