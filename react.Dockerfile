FROM node:20-alpine AS builder
WORKDIR /app

# main | development — tier for .env.* selection (do not set NODE_ENV to these; Vite build needs production).
ARG APP_BUILD_ENV=main
ENV APP_BUILD_ENV=${APP_BUILD_ENV}

COPY package*.json ./
COPY scripts/enforce-minimum-package-age.sh scripts/
RUN npm ci

# env:sync writes .env from .env.${APP_BUILD_ENV}; Vite loadEnv reads REACT_APP_* from .env
COPY . .
RUN npm run validate:env && npm run env:sync && npm run build

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY package*.json ./
COPY scripts/enforce-minimum-package-age.sh scripts/

RUN npm ci --omit=dev && \
    npm install -g serve

EXPOSE 8080
CMD ["serve", "dist", "-l", "8080", "-s"]
