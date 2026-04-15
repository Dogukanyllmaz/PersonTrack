# ── Build stage ─────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Copy lockfile first — layer cache is reused when deps don't change
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

COPY . .

# VITE_API_URL=/api  →  SPA calls /api  →  nginx proxies to backend
ARG VITE_API_URL=/api
ENV VITE_API_URL=/api

RUN npm run build

# ── Runtime stage ────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Non-root user for security
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid

EXPOSE 80

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
