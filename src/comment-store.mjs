export function createCommentStore({ maxComments = 200 } = {}) {
  const comments = [];
  let nextId = 1;

  return {
    count() {
      return nextId - 1;
    },

    recent(limit = 50) {
      return comments.slice(Math.max(0, comments.length - limit));
    },

    create(input, createdAt = new Date().toISOString()) {
      const comment = {
        id: nextId,
        ...input,
        createdAt,
      };

      nextId += 1;
      comments.push(comment);
      comments.splice(0, Math.max(0, comments.length - maxComments));

      return comment;
    },

    clear() {
      comments.splice(0);
      nextId = 1;
    },

    close() {},
  };
}
