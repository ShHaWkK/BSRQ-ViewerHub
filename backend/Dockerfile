# Étape de build
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .

# Étape finale
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app /app
EXPOSE 4000
CMD ["node", "src/server.js"]
