### esbuild-plugin-svg-bundle

[![npm](https://img.shields.io/npm/v/esbuild-plugin-svg-bundle)](https://www.npmjs.com/package/esbuild-plugin-svg-bundle)
[![CI](https://github.com/tim-we/esbuild-plugin-svg-bundle/actions/workflows/build.yml/badge.svg)](https://github.com/tim-we/esbuild-plugin-svg-bundle/actions/workflows/build.yml)
[![node version](https://img.shields.io/node/v/esbuild-plugin-svg-bundle)](https://github.com/tim-we/esbuild-plugin-svg-bundle/blob/main/package.json)

This is a plugin for `esbuild` that bundles all SVG files referenced in CSS files into a single SVG bundle consisting nested SVGs accessible via fragment ids. SVGs will be optimized using [svgo](https://www.npmjs.com/package/svgo) when the [minify option](https://esbuild.github.io/api/#minify) is enabled.

## Install

```sh
npm i -D esbuild-plugin-svg-bundle
```

## Usage

```js
import esbuild from "esbuild";
import svgBundlePlugin from "esbuild-plugin-svg-bundle";

esbuild.build({
    entryPoints: ["src/app.ts"],
    bundle: true,
    outdir: "dist/",
    plugins: [
      svgBundlePlugin({
        bundleFile: "assets/svg-bundle.svg",
        bundleUrl: "../assets/svg-bundle.svg"
      })
    ]
});
```

This will create `dist/assets/svg-bundle.svg` and references in CSS will get remapped from

```css
.element-with-svg-background {
  background-image: url(svg-file.svg);
}
```

using the specified `bundleUrl` to

```css
.element-with-svg-background {
  background-image: url(../assets/svg-bundle.svg#svg-file);
}
```

## Configuration

| property | required? | type | default | description |
| - | - | - | - | - |
| bundleFile | required | string | - | The filepath where the generated should be stored. |
| bundleUrl | required | string | - | The relative or absolute URL where the bundle can be loaded from. |
| hash | optional | string | `undefined` | To help with cache busting you can specify a hash value for the bundle. Later versions of this plugin will likely do this automatically based on the bundle content. |
| gap | optional | number | `1` | Gap between packed images. |
