# Build stage
FROM node:18-alpine as build
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine
# Copy build files from the first stage
COPY --from=build /app/build /usr/share/nginx/html
# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add health check endpoint
RUN echo 'healthy' > /usr/share/nginx/html/health

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]