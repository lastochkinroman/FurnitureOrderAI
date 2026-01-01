FROM node:18-alpine

WORKDIR /app

# Устанавливаем зависимости для ffmpeg
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    make \
    g++

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Создаем директории для данных
RUN mkdir -p /app/data /app/orders

# Устанавливаем права
RUN chown -R node:node /app

USER node

CMD ["node", "app/main.js"]
