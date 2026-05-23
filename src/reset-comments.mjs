import { config } from "./config.mjs";
import { createCommentStore } from "./comment-store.mjs";

const store = createCommentStore(config.paths.dbPath);

try {
  store.clear();
} finally {
  store.close();
}
