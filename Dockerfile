FROM node:24-slim

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
COPY src ./src
COPY public ./public

EXPOSE 3000

CMD ["node", "src/server.mjs"]
