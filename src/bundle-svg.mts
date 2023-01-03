import path from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import SVGSpriter from "svg-sprite";

import type { BuildOptions, Plugin, PluginBuild } from "esbuild";

// path gets shadowed in onResolve
const getBasename = path.basename;

const svgBundlePlugin: PluginFactory = ({ bundleFile, bundleUrl, hash }) => {
  if (bundleFile === undefined || bundleUrl === undefined) {
    throw new Error("[SVG Bundle Plugin] Required options missing.");
  }

  return {
    name: "SVG Bundle Plugin",
    setup(build: PluginBuild) {
      const options = build.initialOptions as Readonly<BuildOptions>;
      const outputFile = path.join(options.outdir, bundleFile);
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
        }
      );

      build.onEnd(async (esbuildResult) => {
        if (svgFileToId.size === 0) {
          return;
        }

        // TODO: remove class attriutes from <view> tags in output
        const spriter = new SVGSpriter({
          dest: options.outdir,
          shape: {
            transform: options.minify ?? true ? ["svgo"] : [],
          },
          svg: {
            doctypeDeclaration: false,
          },
          mode: {
            view: {
              bust: false,
            },
          },
        });

        const metafileInputs: Record<string, MetafileOutputInput> =
          Object.fromEntries(
            await Promise.all(
              Array.from(svgFileToId.entries()).map(
                async ([resolvedPath, svgId]) => {
                  // Load SVG file.
                  const svgData = await readFile(resolvedPath);
                  spriter.add("svg/" + svgId, svgId, svgData.toString("utf-8"));

                  // Create metafile data.
                  return [
                    path.relative(".", resolvedPath),
                    {
                      bytesInOutput: svgData.length,
                    } as MetafileOutputInput,
                  ];
                }
              )
            )
          );

        const { result } = await spriter.compileAsync();

        const outputFileBuffer = result.view.sprite.contents as Buffer;

        // Create the svg bundle file.
        await mkdir(path.dirname(outputFile), { recursive: true });
        await writeFile(outputFile, outputFileBuffer);

        if (esbuildResult.metafile) {
          const relativePath = path.relative(".", outputFile);

          // We are currently using the input file size for the bytesInOutput property,
          // which is only a rough approximation but IMO sufficient for most applications.
          // TODO: check if svg-sprite returns any info about this

          esbuildResult.metafile.outputs[relativePath] = {
            bytes: outputFileBuffer.length,
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
}) => Plugin;

type MetafileOutputInput = { bytesInOutput: number };
