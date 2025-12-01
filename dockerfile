# 1. ETAPA DE CONSTRUCCIÓN
# Usamos una imagen base LTS de Node
FROM node:20-slim AS builder

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copia los archivos de definición de dependencias
COPY package*.json ./

# 🆕 INSTALAR OPENSSL para evitar advertencias de Prisma
# node:20-slim usa apt, por lo que actualizamos e instalamos OpenSSL
RUN apt-get update && apt-get install -y openssl \
    # Limpiamos el caché después de la instalación para reducir el tamaño de la imagen
    && rm -rf /var/lib/apt/lists/*
# ---------------------------------------------

# Instala todas las dependencias. 
RUN npm install

# Copia todo el código fuente al contenedor
COPY . .

# Genera el cliente de Prisma
RUN npx prisma generate

# ========================================================
# 2. ETAPA DE PRODUCCIÓN (Más ligera y segura)
# ========================================================
FROM node:20-slim

# Establece el directorio de trabajo
WORKDIR /usr/src/app

# Copia SÓLO los archivos esenciales y las dependencias ya instaladas desde la etapa 'builder'
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app ./

# Copia las librerías del sistema necesarias para OpenSSL desde la etapa builder
COPY --from=builder /usr/lib/ssl/ /usr/lib/ssl/

# Exponemos el puerto 3000
EXPOSE 3000

# Comando de inicio del servidor
CMD [ "node", "backend/src/app.js" ]