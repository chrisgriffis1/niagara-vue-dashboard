# Niagara Navigator - Docker Container
# Build: docker build -t niagara-navigator .
# Run:   docker run -p 8080:80 niagara-navigator
# Open:  http://localhost:8080

FROM nginx:alpine

# Copy built files
COPY dist/ /usr/share/nginx/html/

# Copy standalone version too
COPY niagara-navigator-standalone.html /usr/share/nginx/html/standalone.html

# Custom nginx config for Vue router
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

