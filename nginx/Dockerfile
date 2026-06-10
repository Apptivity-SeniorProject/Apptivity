FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY origin.pem /etc/nginx/ssl/origin.pem
COPY privkey.pem /etc/nginx/ssl/privkey.pem

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
