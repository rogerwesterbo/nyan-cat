FROM nginxinc/nginx-unprivileged:alpine
WORKDIR /usr/share/nginx/html

COPY src/nginx/http_prod.conf /etc/nginx/conf.d/default.conf
COPY src/audio /usr/share/nginx/html/audio
COPY src/css /usr/share/nginx/html/css
COPY src/font /usr/share/nginx/html/font
COPY src/js /usr/share/nginx/html/js
COPY src/index.html /usr/share/nginx/html/index.html
COPY src/favicon.ico /usr/share/nginx/html/favicon.ico

