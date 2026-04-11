# Build stage
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

# VITE_API_URL=/api so the SPA calls /api which nginx proxies to the backend
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Runtime stage — nginx serves the built SPA and proxies /api
FROM nginx:alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
