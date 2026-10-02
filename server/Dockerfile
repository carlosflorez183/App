# ─────────────────────────────────────────────
#  API UniPlataforma
#
#  El contexto de build es la RAÍZ del repositorio
#  (ver docker-compose.yml) porque el seed importa
#  los datos de demostración desde src/data/mockData.js.
#  Así hay una sola fuente de verdad para los datos.
# ─────────────────────────────────────────────
FROM node:22-bookworm-slim

# Prisma necesita OpenSSL y CA para talking por TLS con Postgres.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Primero los manifiestos: mientras no cambien, npm reutiliza la capa.
COPY server/package.json ./
RUN npm install --no-audit --no-fund

COPY server/prisma ./prisma
COPY server/src ./src

# Datos de demostración del frontend, solo para el seed.
COPY src/data ./mock

ENV NODE_ENV=production
ENV PORT=3000
ENV MOCK_DATA_PATH=/app/mock/mockData.js
EXPOSE 3000

CMD ["sh", "-c", "npx prisma generate && node src/index.js"]
