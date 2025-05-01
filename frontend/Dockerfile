# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
# Copy custom nginx config if needed
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD wget -q -O /dev/null http://localhost || exit 1

CMD ["nginx", "-g", "daemon off;"]
