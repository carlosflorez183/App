# ---------- build ----------
FROM node:22-alpine AS build

WORKDIR /app

# Primero solo los manifiestos: mientras no cambien, la capa de dependencias
# se reutiliza y no se reinstala node_modules en cada build.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

# ---------- runtime ----------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Se usa 127.0.0.1 y no localhost: en alpine "localhost" resuelve tambien a
# ::1 y nginx solo escucha en IPv4, asi que wget recibiria "connection refused".
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
