# 1. ETAPA DE CONSTRUCCIÓN (Mejor para dependencias nativas como bcrypt)
# Usamos una imagen base LTS de Node
FROM node:20-slim AS builder

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copia los archivos de definición de dependencias
COPY package*.json ./

# Instala todas las dependencias. 
# La clave es instalar Prisma Client para la etapa de producción.
RUN npm install

# Copia todo el código fuente al contenedor
COPY . .

# Genera el cliente de Prisma, ya que el Query Engine es necesario para la ejecución.
# EasyPanel ejecutará las migraciones usando el comando Pre-Deploy, pero generamos el cliente aquí.
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

# Exponemos el puerto 3000, aunque EasyPanel lo mapea automáticamente usando la variable PORT.
EXPOSE 3000

# Comando de inicio del servidor
# Usamos 'npm start' (que debería ser `node backend/src/app.js` en tu caso)
# Para este Dockerfile, asumimos que el Start Command se configura en EasyPanel, 
# pero podemos definirlo aquí:
CMD [ "node", "backend/src/app.js" ]