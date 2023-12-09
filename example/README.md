1. Run `npm install` to install the required dependencies.
2. Run `npm start` to run esbuild with the plugin. The generated output will be placed in the `dist` folder.
3. Open `index.html` (does not require a server).

You will see the two SVG images `a.svg` and `b.svg`, but they are loaded from the generated SVG bundle file `dist/svg-bundle.svg`.
