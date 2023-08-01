import path from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { optimize } from "svgo";

import type { BuildOptions, Plugin, PluginBuild } from "esbuild";
import type { Config as SVGOConfig } from "svgo";

import extractSVG, { ExtractedSVG } from "./extract.mjs";
import packAndRender from "./pack.mjs";

// path gets shadowed in onResolve
const getBasename = path.basename;

const svgoConfig: SVGOConfig = {
  multipass: true,
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          removeViewBox: false,
        },
      },
    },
  ],
};

const svgBundlePlugin: PluginFactory = ({
  bundleFile,
  bundleUrl,
  hash,
  gap,
}) => {
  if (bundleFile === undefined || bundleUrl === undefined) {
    throw new Error("[SVG Bundle Plugin] Required options missing.");
  }

  return {
    name: "SVG Bundle Plugin",
    setup(build: PluginBuild) {
      const options = build.initialOptions as Readonly<BuildOptions>;
      const outputFile = path.join(options.outdir ?? ".", bundleFile);
      const svgFileToId = new Map<string, string>();
      const svgIds = new Set<string>();

      build.onResolve(
        { filter: /\.svg$/, namespace: "file" },
        async ({ path, kind, resolveDir }) => {
          if (kind !== "url-token") {
            return;
          }

          const result = await build.resolve(path, {
            kind,
            resolveDir,
            namespace: "bundled-svg",
          });

          if (result.errors.length > 0) {
            return { errors: result.errors };
          }

          let svgId;
          if (svgFileToId.has(result.path)) {
            // This file has already been added to the svg bundle. Reuse it.
            svgId = svgFileToId.get(result.path);
          } else {
            // A new svg file. Create a unique identifier for it.
            svgId = createUniqueId(getBasename(result.path, ".svg"), svgIds);
            svgFileToId.set(result.path, svgId);
            svgIds.add(svgId);
          }

          // We do not know the hash of the final bundle at this point
          // so the user has to supply a value for cache busting.
          // TODO: consider running esbuild twice
          const hashStr = hash ? `?hash=${hash}` : "";

          // We load the contents of the SVG file in the onEnd callback.
          return {
            path: `${bundleUrl}${hashStr}#${svgId}`,
            external: true,
            sideEffects: false,
            watchFiles: [result.path],
          };
        },
      );

      build.onEnd(async (esbuildResult) => {
        if (svgFileToId.size === 0) {
          return;
        }

        const collectedSVGs: ExtractedSVG[] = [];

        const metafileInputs: Record<string, MetafileOutputInput> =
          Object.fromEntries(
            await Promise.all(
              Array.from(svgFileToId.entries()).map(
                async ([resolvedPath, svgId]) => {
                  // Load SVG file.
                  const svgData = await readFile(resolvedPath);

                  // Optimize with svgo when minify is enabled.
                  const svgString = options.minify
                    ? optimize(svgData.toString("utf-8"), svgoConfig).data
                    : svgData.toString("utf-8");

                  // Parse & extract.
                  const result = await extractSVG(svgId, svgString);
                  collectedSVGs.push(result);

                  // Create metafile data.
                  return [
                    path.relative(".", resolvedPath),
                    {
                      bytesInOutput: Buffer.byteLength(svgString, "utf-8"),
                    } as MetafileOutputInput,
                  ];
                },
              ),
            ),
          );

        const svgOutput = packAndRender(collectedSVGs, gap ?? 1);

        // Create the svg bundle file.
        await mkdir(path.dirname(outputFile), { recursive: true });
        await writeFile(outputFile, svgOutput, "utf-8");

        if (esbuildResult.metafile) {
          const relativePath = path.relative(".", outputFile);

          // We are currently using the input file size for the bytesInOutput property,
          // which is only a rough approximation but probably sufficient for most applications.

          esbuildResult.metafile.outputs[relativePath] = {
            bytes: svgOutput.length,
            inputs: metafileInputs,
            imports: [],
            exports: [],
          };
        }
      });
    },
  };
};

export default svgBundlePlugin;

function createUniqueId(basename: string, usedIds: Set<string>): string {
  if (!usedIds.has(basename)) {
    return basename;
  }

  let i = 1;
  let idCandidate = basename;

  do {
    i++;
    idCandidate = basename + "-" + i;
    if (i === Number.MAX_SAFE_INTEGER) {
      throw new Error();
    }
  } while (usedIds.has(idCandidate));

  return idCandidate;
}

type PluginFactory = (options: {
  bundleFile: string;
  bundleUrl: string;
  hash?: string;
  gap?: number;
}) => Plugin;

type MetafileOutputInput = { bytesInOutput: number };
