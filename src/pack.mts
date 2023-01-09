import type { ExtractedSVG } from "./extract.mjs";
import render from "dom-serializer";

export default function packAndRender(
    svgs: ExtractedSVG[],
    gap: number
): string {
    const elementsPerRow = Math.max(1, Math.round(Math.sqrt(svgs.length)));
    const positions = new Map<ExtractedSVG, { x: number; y: number }>();

    let currentX = 0;
    let currentY = 0;
    let maxHeightInRow = 0;
    let maxRowWidth = 0;
    let svgsInRow = 0;

    for (const svg of svgs) {
        positions.set(svg, { x: currentX, y: currentY });
        currentX += Math.ceil(svg.viewBox.width + gap);
        maxHeightInRow = Math.max(svg.viewBox.height, maxHeightInRow);
        svgsInRow++;

        if (svgsInRow === elementsPerRow) {
            maxRowWidth = Math.max(maxRowWidth, currentX - gap);
            currentX = 0;
            currentY += Math.ceil(maxHeightInRow + gap);
            maxHeightInRow = 0;
            svgsInRow = 0;
        }
    }

    const packedSVGHeight =
        currentX === 0 ? currentY - gap : currentY + maxHeightInRow;
    const packedViewBox = `0 0 ${Math.ceil(maxRowWidth)} ${Math.ceil(
        packedSVGHeight
    )}`;

    let packedSVG = `<svg version="1.1" viewBox="${packedViewBox}" xmlns="http://www.w3.org/2000/svg">\n`;
    for (const [data, position] of positions) {
        const { x, y } = position;
        const { width, height } = data.viewBox;

        // Move SVG
        data.svg.attribs = {
            ...data.svg.attribs,
            x: "" + x,
            y: "" + y,
            width: "" + width,
            height: "" + height,
        };

        // Render SVG string
        packedSVG += `<view id="${data.id}" viewBox="${x} ${y} ${width} ${height}"/>\n`;
        packedSVG += render(data.svg, { xmlMode: true }) + "\n\n";
    }
    packedSVG += `</svg>\n`;

    return packedSVG;
}
