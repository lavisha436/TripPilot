# =========================================================
# Stage 1: Build static assets using Node.js 20 Alpine
# =========================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests for layer caching
COPY package.json package-lock.json ./

# Install dependencies using clean install
RUN npm ci

# Copy client source files
COPY . .

# Accept and expose build-time API URL to Vite
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Compile production bundle into dist/
RUN npm run build

# =========================================================
# Stage 2: Serve static production assets with NGINX Alpine
# =========================================================
FROM nginx:alpine

# Remove default NGINX configuration and placeholder files
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy custom NGINX configuration with SPA fallback routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose container HTTP port
EXPOSE 80

# Run NGINX in foreground mode
CMD ["nginx", "-g", "daemon off;"]
