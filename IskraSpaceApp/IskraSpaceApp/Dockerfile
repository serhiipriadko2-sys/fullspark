# Multi-stage build for IskraSpaceApp
# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source files
COPY . .

# Build the application
RUN npm run build:prod

# Stage 2: Production image with nginx
FROM nginx:alpine AS production

# Install nodejs for runtime environment variables substitution (if needed)
RUN apk add --no-cache nodejs npm

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy canon files (needed at runtime)
COPY --from=builder /app/canon /usr/share/nginx/html/canon

# Create non-root user for security
RUN addgroup -g 1001 -S iskra && \
    adduser -S iskra -u 1001 && \
    chown -R iskra:iskra /usr/share/nginx/html && \
    chown -R iskra:iskra /var/cache/nginx && \
    chown -R iskra:iskra /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R iskra:iskra /var/run/nginx.pid

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Switch to non-root user
USER iskra

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
