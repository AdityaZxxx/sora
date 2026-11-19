import { readFile } from "node:fs/promises";
import { join } from "node:path";

const readAsset = (path: string) => readFile(join(process.cwd(), path));

export const ogColors = {
  background: "#0E0F10",
  card: "#1A1A1A",
  border: "#393939",
  foreground: "#F4F4F4",
  muted: "#C6C6C6",
  primary: "#155DFC",
  lightBlue: "#78A9FF",
  income: "#00D492",
  expense: "#FF637E",
};

const [logoSvg, regular, semiBold] = await Promise.all([
  readAsset("public/logo.svg").then((file) =>
    file.toString("utf8").replaceAll("currentColor", ogColors.foreground),
  ),
  readAsset("assets/fonts/Geist-Regular.ttf"),
  readAsset("assets/fonts/Geist-SemiBold.ttf"),
]);

export const logoSrc = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;

type OgFont = {
  name: string;
  data: Buffer;
  style: "normal";
  weight: 400 | 600;
};

export const ogFonts: OgFont[] = [
  { name: "Geist", data: regular, style: "normal", weight: 400 },
  { name: "Geist", data: semiBold, style: "normal", weight: 600 },
];

export const OG_SIZE = { width: 1200, height: 630 };
