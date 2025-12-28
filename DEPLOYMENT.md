# Crossword Deployment Guide

Deploying the collaborative crossword puzzle app to Oracle Cloud.

## Server Information

| Property | Value |
|----------|-------|
| **IP Address** | `64.181.235.94` |
| **Instance Type** | Oracle Cloud Free Tier (VM.Standard.E2.1.Micro) |
| **RAM** | 1 GB (very limited) |
| **SSH Access** | `ssh -i oracle_key.key ubuntu@64.181.235.94` |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Oracle Cloud VM                          │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │   Nginx     │───▶│   Node.js   │───▶│     Redis       │  │
│  │   :80       │    │   :3001     │    │     :6379       │  │
│  │  (static +  │    │  (API +     │    │   (puzzles +    │  │
│  │   proxy)    │    │  WebSocket) │    │   game state)   │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
│                                                             │
│  ┌─────────────┐                                            │
│  │  Factorio   │  ← Also running on this VM                 │
│  │   :34197    │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

## Quick Commands

### Deploy (from local machine)
```bash
# Build client locally (server can't handle builds)
cd /Users/sethjohnson/Code/crossword
npm run build -w @crossword/client

# Upload to server
rsync -avz --delete -e "ssh -i oracle_key.key" \
  packages/client/dist \
  packages/server/dist \
  docker-compose.yml \
  nginx.conf \
  ubuntu@64.181.235.94:~/crossword/
```

### Start App on Server
```bash
ssh -i oracle_key.key ubuntu@64.181.235.94 "cd crossword && sudo docker compose up -d"
```

### Stop App (to free RAM for Factorio)
```bash
ssh -i oracle_key.key ubuntu@64.181.235.94 "cd crossword && sudo docker compose stop"
```

### View Logs
```bash
ssh -i oracle_key.key ubuntu@64.181.235.94 "sudo docker logs crossword-server-1 --tail 50"
```

### Check Container Status
```bash
ssh -i oracle_key.key ubuntu@64.181.235.94 "sudo docker ps && sudo docker stats --no-stream"
```

### Check RAM Usage
```bash
ssh -i oracle_key.key ubuntu@64.181.235.94 "free -h"
```

## RAM Considerations

Oracle Free Tier has only **1 GB RAM**. This setup is optimized:

| Component | Est. RAM |
|-----------|----------|
| Redis | ~30-50 MB |
| Node.js (server) | ~50-100 MB |
| Nginx | ~10-20 MB |
| **Total** | ~100-170 MB |

**Note**: Factorio uses ~500-800 MB. You may need to stop one to run the other.

## Build Locally, Deploy Pre-built

The server can't build React apps (needs 2-4 GB RAM). Instead:

1. **Build locally** on your Mac
2. **Upload built files** to server
3. **Deploy pre-built** Docker image

```bash
# Local build
npm run build -w @crossword/client
npm run build -w @crossword/server

# Upload
rsync -avz -e "ssh -i oracle_key.key" \
  packages/client/dist/ ubuntu@64.181.235.94:~/crossword/client/
rsync -avz -e "ssh -i oracle_key.key" \
  packages/server/dist/ ubuntu@64.181.235.94:~/crossword/server/
```

## Environment Variables

Create `.env` on server:
```bash
NODE_ENV=production
REDIS_URL=redis://redis:6379
PORT=3001
```

## Firewall / Security List

Ensure these ports are open in Oracle Cloud Security List:
- **80** (HTTP)
- **443** (HTTPS, if using SSL later)
- **34197/UDP** (Factorio)

## Troubleshooting

### Out of Memory
```bash
# Check what's using RAM
free -h
docker stats --no-stream

# Stop containers to free RAM
sudo docker compose stop
```

### Container Won't Start
```bash
# Check logs
sudo docker logs crossword-server-1 --tail 100

# Rebuild
sudo docker compose build --no-cache
```

### Redis Connection Issues
```bash
# Check Redis is running
sudo docker exec -it crossword-redis-1 redis-cli ping
# Should return: PONG
```
