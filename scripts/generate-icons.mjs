// Renders the manifest PNG icons from the same design as src/app/icon.tsx.
// Run with: node scripts/generate-icons.mjs
import { writeFile } from "node:fs/promises";
import { ImageResponse } from "next/og.js";

const h = (type, props, ...children) => ({ $$typeof: Symbol.for("react.element"), type, key: null, ref: null, props: { ...props, children: children.length > 1 ? children : children[0] } });

async function render(size, { padding }) {
  const response = new ImageResponse(
    h("div", { style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: padding ? "#0d665d" : "#ed684d", fontFamily: "Georgia, serif" } },
      h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", width: padding ? `${Math.round(size * 0.62)}px` : "100%", height: padding ? `${Math.round(size * 0.62)}px` : "100%", background: "#ed684d", borderRadius: padding ? `${Math.round(size * 0.18)}px` : 0, color: "white", fontSize: `${Math.round(size * 0.42)}px`, fontWeight: 700 } }, "JH")),
    { width: size, height: size },
  );
  return Buffer.from(await response.arrayBuffer());
}

await writeFile("public/icons/icon-192.png", await render(192, { padding: false }));
await writeFile("public/icons/icon-512.png", await render(512, { padding: false }));
await writeFile("public/icons/icon-512-maskable.png", await render(512, { padding: true }));

// favicon.ico: a single 64x64 PNG in an ICO container. Bare /favicon.ico requests
// (Google's favicon crawler, feed readers) do not go through app/icon.tsx.
const png = await render(64, { padding: false });
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0);           // reserved
header.writeUInt16LE(1, 2);           // type: icon
header.writeUInt16LE(1, 4);           // image count
header.writeUInt8(64, 6);             // width
header.writeUInt8(64, 7);             // height
header.writeUInt8(0, 8);              // palette size
header.writeUInt8(0, 9);              // reserved
header.writeUInt16LE(1, 10);          // colour planes
header.writeUInt16LE(32, 12);         // bits per pixel
header.writeUInt32LE(png.length, 14); // payload size
header.writeUInt32LE(22, 18);         // payload offset
await writeFile("src/app/favicon.ico", Buffer.concat([header, png]));

console.log("icons written");
