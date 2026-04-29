# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /web

COPY package.json package-lock.json ./
RUN npm ci --silent

COPY . .
RUN npm run build

# ─── Stage 2: Runtime (Nginx) ─────────────────────────────────────────────────
FROM nginx:alpine

# SPA yönlendirmesi için Nginx config dosyasını kopyala
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Derlenen React dosyalarını kopyala
COPY --from=builder /web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
