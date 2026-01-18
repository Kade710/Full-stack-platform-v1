#!/usr/bin/env bash
set -e
docker compose up -d --build
docker compose ps
echo
curl -sS http://localhost:8080/api/health || true
