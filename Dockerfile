FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HELIOS_DATA_DIR=/data \
    CODEX_HOME=/data/codex \
    PORT=3000

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git python3 python3-pip \
  && python3 -m pip install --break-system-packages uv==0.8.17 \
  && npm install --global @openai/codex@0.151.0 \
  && git clone --depth 1 https://github.com/jdmnk/codex-imagegen-cli.git /opt/codex-imagegen-cli \
  && cd /opt/codex-imagegen-cli \
  && git fetch --depth 1 origin a739870aa9d600cfd0c382b6c06f38d0b1f5108b \
  && git checkout a739870aa9d600cfd0c382b6c06f38d0b1f5108b \
  && UV_TOOL_BIN_DIR=/usr/local/bin uv tool install . \
  && rm -rf /var/lib/apt/lists/* /root/.cache /opt/codex-imagegen-cli/.git

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN mkdir -p /data/codex /data/images /data/references /data/db
VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "server.js"]
