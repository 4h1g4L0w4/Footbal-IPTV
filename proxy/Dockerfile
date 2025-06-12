# Usamos la imagen oficial de Node.js (elige la versión que quieras)
FROM node:18-alpine

# Crear directorio de la app
WORKDIR /app

# Copiar package.json y package-lock.json (si tienes)
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer puerto (puedes cambiarlo si quieres)
EXPOSE 3000

# Comando para arrancar la app
CMD ["node", "index.js"]
