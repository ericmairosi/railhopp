# Darwin Broker Dockerfile
FROM node:20-slim AS build
WORKDIR /app
ENV NODE_ENV=development

# Install pnpm
RUN npm i -g pnpm@10.15.0

# Copy package manifests
COPY package.json tsconfig.json ./
# Install dependencies
RUN pnpm install --frozen-lockfile=false

# Copy source and build
COPY src ./src
RUN pnpm build

# Production image
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

# Copy only the built artifacts and production deps
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 4001
CMD ["node", "--enable-source-maps", "dist/index.js"]