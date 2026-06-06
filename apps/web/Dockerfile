# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install only web dependencies
COPY apps/web/package.json apps/web/package-lock.json* ./apps/web/
RUN npm install --prefix apps/web

# Copy full web app and build
COPY apps/web/ ./apps/web/
RUN npm run build --prefix apps/web

# Stage 2: Runtime (Nginx)
FROM nginx:alpine

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
