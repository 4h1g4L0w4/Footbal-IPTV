# Dockerfile (liviano con navegador separado)
FROM node:20-slim

# Instalar Chrome o Chromium
RUN apt update && apt install -y chromium

ENV BROWSER_PATH=/usr/bin/chromium

WORKDIR /app
COPY . .
RUN npm install

EXPOSE 5000
CMD ["npm", "start"]
