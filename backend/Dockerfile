FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-writer poppler-utils fonts-liberation chromium ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY *.js ./
COPY clip-policy.json ./
ENV NODE_ENV=production SOFFICE_PATH=/usr/bin/libreoffice PDFTOTEXT_PATH=/usr/bin/pdftotext CHROMIUM_PATH=/usr/bin/chromium
RUN npm test && npm run test:browser
USER node
EXPOSE 10000
CMD ["node","server.js"]
