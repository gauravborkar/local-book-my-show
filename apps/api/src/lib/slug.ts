export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  let slug = slugify(base);
  if (!slug) slug = "item";
  let candidate = slug;
  let n = 1;
  while (await exists(candidate)) {
    candidate = `${slug}-${n}`;
    n += 1;
  }
  return candidate;
}
