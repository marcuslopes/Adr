import fs from "fs/promises";
import path from "path";
import { adrFilename, toMadr, AdrFields } from "@/lib/madr";

export async function writeAdrFile(
  basePath: string,
  fields: AdrFields
): Promise<string> {
  await fs.mkdir(basePath, { recursive: true });
  const filename = adrFilename(fields.number, fields.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  const filepath = path.join(basePath, filename);
  await fs.writeFile(filepath, toMadr(fields), "utf-8");
  return filepath;
}

export async function gitCommitAdr(opts: {
  repoPath: string;
  filepath: string;
  adrNumber: number;
  title: string;
  branch: string;
  token?: string;
  remoteUrl?: string;
}): Promise<void> {
  const { simpleGit } = await import("simple-git");
  const git = simpleGit(opts.repoPath);

  await git.add(opts.filepath);
  await git.commit(
    `adr: add ADR-${String(opts.adrNumber).padStart(4, "0")} ${opts.title}`
  );

  if (opts.token && opts.remoteUrl) {
    // Inject token into remote URL for push auth
    const authedUrl = opts.remoteUrl.replace(
      "https://",
      `https://${opts.token}@`
    );
    await git.push(authedUrl, opts.branch);
  }
}
