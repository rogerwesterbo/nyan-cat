FROM nginxinc/nginx-unprivileged:alpine
WORKDIR /app

COPY nginx/http_prod.conf /etc/nginx/conf.d/default.conf
COPY audio /app/audio
COPY css /app/css
COPY font /app/font
COPY js /app/js
COPY index.html /app/index.html
COPY favicon.ico /app/favicon.ico

