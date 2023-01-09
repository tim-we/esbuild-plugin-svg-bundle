import { Parser } from "htmlparser2";
import { DomHandler } from "domhandler";

import type { ChildNode, Element } from "domhandler";

export default async function extractSVG(
  id: string,
  rawSVG: string
): Promise<ExtractedSVG> {
  if (!id) {
    throw new Error("id may not be empty");
  }

  const svgDoc = await parse(rawSVG);

  // Find root svg element. Ignore doctype & comments.
  const svg = svgDoc.find<Element>(
    (element: ChildNode): element is Element =>
      element.type === "tag" && element.name === "svg"
  );
  if (svg === undefined) {
    throw new Error("<svg> not found.");
  }

  // Get viewBox attribute.
  const viewBox = svg.attribs.viewBox as string | undefined;
  if (viewBox === undefined) {
    throw new Error("No viewBox.");
  }

  // Parse viewBox.
  const [minX, minY, width, height] = viewBox
    .replace(",", " ")
    .replace(/\s+/, " ")
    .split(" ")
    .map((s) => parseInt(s, 10));

  // Reset attributes.
  svg.attribs = {
    x: "0",
    y: "0",
    width: "" + width,
    height: "" + height,
    viewBox: viewBox,

    // Allow presentation attributes.
    fill: svg.attribs.fill,
    stroke: svg.attribs.stroke,
  };

  return {
    id,
    svg,
    viewBox: {
      minX,
      minY,
      width,
      height,
      original: viewBox,
    },
  };
}

export type ExtractedSVG = {
  id: string;
  svg: Element;
  viewBox: {
    minX: number;
    minY: number;
    width: number;
    height: number;
    original: string;
  };
};

function parse(rawSVG: string): Promise<ChildNode[]> {
  return new Promise((resolve, reject) => {
    const parser = new Parser(
      new DomHandler((error, dom) => {
        if (error) {
          reject(error);
        }
        resolve(dom);
      }),
      {
        xmlMode: true, // required to preserve attribute case
      }
    );

    parser.write(rawSVG);
    parser.end();
  });
}
