import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 3000);

export const config = {
  host: process.env.HOST || "0.0.0.0",
  port,
  publicUrl: process.env.PUBLIC_URL || "",
  paths: {
    rootDir,
    publicDir: path.join(rootDir, "public"),
  },
};
