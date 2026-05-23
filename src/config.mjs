import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.resolve(
  process.env.DATA_DIR || path.join(rootDir, "data"),
);
const port = Number(process.env.PORT || 3000);

export const config = {
  host: process.env.HOST || "0.0.0.0",
  port,
  publicUrl: process.env.PUBLIC_URL || "",
  paths: {
    rootDir,
    publicDir: path.join(rootDir, "public"),
    dataDir,
    dbPath: path.join(dataDir, "comments.sqlite"),
  },
};
