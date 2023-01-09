### esbuild-plugin-svg-bundle

This is a plugin for `esbuild` that bundles all SVG files referenced in CSS files into a single SVG bundle consisting nested SVGs accessible via fragment ids.

## Install

```js
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
| bundleFile | required | string | - | Coming soon™ |
| bundleUrl | required | string | - | Coming soon™ |
| hash | optional | string | `undefined` | Coming soon™ |
| gap | optional | number | `1` | Gap between packed images. |
