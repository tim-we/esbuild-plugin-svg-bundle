import esbuild from "esbuild";
import svgBundlePlugin from "esbuild-plugin-svg-bundle";

esbuild.build({
    entryPoints: ["app.js"],
    bundle: true,
    outdir: "dist/",
    plugins: [
      svgBundlePlugin({
        bundleFile: "svg-bundle.svg",
        bundleUrl: "./svg-bundle.svg"
      })
    ]
});