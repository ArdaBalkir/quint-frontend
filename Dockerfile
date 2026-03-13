# Build stage
FROM node:20-slim AS builder

ARG MODE=production

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --mode $MODE

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Create custom Nginx config for path-based routing
RUN echo 'server { \
    listen 3000; \
    \
    # Handle requests at root / \
    location / { \
    alias /usr/share/nginx/html/; \
    try_files $uri $uri/ /index.html; \
    \
    # Rewrite asset paths \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { \
    expires max; \
    add_header Cache-Control "public, no-transform"; \
    } \
    } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]