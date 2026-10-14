FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY scripts ./scripts
COPY site ./site
COPY admin-site ./admin-site
RUN addgroup -S app && adduser -S app -G app && mkdir /data && chown app:app /data
USER app
ENV NODE_ENV=production PORT=8080 ADMIN_PORT=8081 ADMIN_HOST=0.0.0.0 DATA_DIR=/data
EXPOSE 8080 8081
VOLUME /data
HEALTHCHECK CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["npm","start"]
