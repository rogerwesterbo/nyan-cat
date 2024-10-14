FROM nginxinc/nginx-unprivileged:alpine
WORKDIR /app

COPY src/nginx/http_prod.conf /etc/nginx/conf.d/default.conf
COPY src/audio /app/audio
COPY src/css /app/css
COPY src/font /app/font
COPY src/js /app/js
COPY src/index.html /app/index.html
COPY src/favicon.ico /app/favicon.ico

