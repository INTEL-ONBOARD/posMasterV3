# Central POSMaster online API server.
# Minimal build context (see deploy/README.md): package.json, package-lock.json,
# and src/online-server/ only — the server is fully self-contained.
FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production

# Install production deps only. --ignore-scripts skips the repo's
# electron-rebuild postinstall (there is no Electron on the server).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY src/online-server ./src/online-server

EXPOSE 4100
CMD ["node", "src/online-server/server.cjs"]
