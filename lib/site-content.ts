import "server-only";

import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PageSlug } from "@/lib/site";

const getSiteContentPath = (name: string) =>
  path.join(process.cwd(), "site-content", `${name}.html`);

export const getSiteFragment = cache(async (name: PageSlug | "header" | "footer") =>
  readFile(getSiteContentPath(name), "utf8")
);
