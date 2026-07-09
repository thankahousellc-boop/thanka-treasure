import bwipjs from "bwip-js/node";

// Renders a Code128 barcode as an inline SVG string. SVG keeps it crisp at any
// print size and needs no canvas/DOM, so it runs in a server component.
export function renderBarcodeSvg(value: string) {
  return bwipjs.toSVG({
    bcid: "code128",
    text: value,
    height: 12,
    includetext: true,
    textxalign: "center",
    textsize: 8,
  });
}
