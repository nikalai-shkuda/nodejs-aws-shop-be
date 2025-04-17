FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

RUN npm prune --omit=dev

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

COPY --from=builder /app ./

ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "dist/index.js"]