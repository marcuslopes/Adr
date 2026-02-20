export interface AdrFields {
  number: number;
  title: string;
  status: string;
  context: string;
  decision: string;
  consequences: string;
  supersedes?: Array<{ number: number; slug: string; title: string }>;
  related?: Array<{ number: number; slug: string; title: string }>;
}

/** Render ADR fields to MADR markdown string */
export function toMadr(fields: AdrFields): string {
  const num = String(fields.number).padStart(4, "0");
  let md = `# ADR-${num}: ${fields.title}\n\n`;
  md += `## Status\n${fields.status}\n\n`;
  md += `## Context\n${fields.context}\n\n`;
  md += `## Decision\n${fields.decision}\n\n`;
  md += `## Consequences\n${fields.consequences}\n`;

  const links: string[] = [];
  if (fields.supersedes?.length) {
    for (const s of fields.supersedes) {
      links.push(
        `- Supersedes [ADR-${String(s.number).padStart(4, "0")}: ${s.title}](./${String(s.number).padStart(4, "0")}-${s.slug}.md)`
      );
    }
  }
  if (fields.related?.length) {
    for (const r of fields.related) {
      links.push(
        `- Related to [ADR-${String(r.number).padStart(4, "0")}: ${r.title}](./${String(r.number).padStart(4, "0")}-${r.slug}.md)`
      );
    }
  }

  if (links.length) {
    md += `\n## Links\n${links.join("\n")}\n`;
  }

  return md;
}

/** Generate a URL-safe slug from a title */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Filename for a file-mode ADR */
export function adrFilename(number: number, slug: string): string {
  return `${String(number).padStart(4, "0")}-${slug}.md`;
}
