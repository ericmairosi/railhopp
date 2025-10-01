# Darwin Broker (Kafka Push Port → REST/WS)

This service connects to the Darwin Push Port Kafka topic (Confluent Cloud), ingests real-time messages, caches recent events in memory, and exposes simple REST + WebSocket endpoints so the web app can consume real-time data over HTTPS.

## Endpoints

- GET /health
  - Returns broker status, message counts, last message time
- GET /station/:crs/recent
  - Returns recent cached events for a station (by CRS)
- WS /ws
  - Broadcasts `{ type: 'movement', crs, body }` for each ingested event

## Environment

Required:

- KAFKA_BROKERS=pkc-z3p1v0.europe-west2.gcp.confluent.cloud:9092
- KAFKA_SASL_USERNAME=<Confluent Cloud API Key>
- KAFKA_SASL_PASSWORD=<Confluent Cloud API Secret>
- KAFKA_TOPIC=prod-1010-Darwin-Train-Information-Push-Port-IIII2_0-JSON

Optional:

- BROKER_PORT=4001 (default)
- KAFKA_CLIENT_ID=railhopp-darwin-broker
- KAFKA_GROUP_ID=railhopp-darwin-consumers
- LOG_LEVEL=info

## Development

```bash
pnpm --filter @railhopp/darwin-broker install
pnpm --filter @railhopp/darwin-broker dev
```

Set env vars (recommended .env file in this folder):

```
KAFKA_BROKERS=pkc-z3p1v0.europe-west2.gcp.confluent.cloud:9092
KAFKA_SASL_USERNAME=XXX
KAFKA_SASL_PASSWORD=YYY
KAFKA_TOPIC=prod-1010-Darwin-Train-Information-Push-Port-IIII2_0-JSON
BROKER_PORT=4001
```

## Docker

```Dockerfile
# Use Node 20 runtime
FROM node:20-slim AS base
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm i -g pnpm && pnpm install --prod=false && pnpm build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/package.json ./
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
EXPOSE 4001
CMD ["node", "--enable-source-maps", "dist/index.js"]
```

## Notes

- This is a minimal broker for development. In production, consider persisting state (e.g., Redis) and adding auth/rate limits.
- The app can call the broker instead of direct STOMP/Kafka to avoid local firewall issues.
