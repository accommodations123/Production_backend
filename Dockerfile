FROM node:18-alpine

WORKDIR /Production_backend

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]

