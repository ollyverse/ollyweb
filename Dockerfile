# syntax=docker/dockerfile:1

# --- build: static site into /app/dist ---------------------------------------
# the output is plain HTML/CSS/JS, so build once on the runner's own platform
FROM --platform=$BUILDPLATFORM node:26-alpine AS build
ENV ASTRO_TELEMETRY_DISABLED=1
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- serve: unprivileged nginx on :8080 --------------------------------------
FROM nginxinc/nginx-unprivileged:1.30-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO /dev/null http://127.0.0.1:8080/ || exit 1
