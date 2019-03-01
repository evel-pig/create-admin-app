FROM keymetrics/pm2 AS build
# WORKDIR /app

# Build and bundle APP files
COPY ./ src-tmp/
RUN mkdir app
RUN cd src-tmp && npm install --registry=https://registry.npm.taobao.org && npm run build && cd dist && npm install --production --registry=https://registry.npm.taobao.org

FROM keymetrics/pm2
COPY --from=build src-tmp/pm2.json pm2.json
COPY --from=build src-tmp/dist/ /app

CMD [ "pm2-runtime", "start", "pm2.json" ]