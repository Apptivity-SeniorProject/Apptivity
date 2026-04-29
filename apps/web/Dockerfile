# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Monorepo kilit dosyalarını ve workspace manifestolarını kopyala
COPY package.json ./
COPY apps/web/package.json ./apps/web/

# Bağımlılıkları yükle (Sadece Workspace'leri destekleyecek şekilde)
RUN npm install --silent

# Web projesinin tamamını kopyala
COPY apps/web/ ./apps/web/

# Web workspace'ini build et
RUN npm run build -w web

# ─── Stage 2: Runtime (Nginx) ─────────────────────────────────────────────────
FROM nginx:alpine

# SPA yönlendirmesi için Nginx config dosyasını kopyala
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Derlenen React dosyalarını kopyala
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
