import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const source = resolve(root, "out");
const destination = resolve(root, "dist");

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
await writeFile(resolve(destination, ".nojekyll"), "", "utf8");
await mkdir(resolve(destination, "server"), { recursive: true });
await build({
  entryPoints: [resolve(root, "worker", "index.ts")],
  outfile: resolve(destination, "server", "index.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
});
