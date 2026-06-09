#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

pids=()

cleanup() {
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
}

trap cleanup INT TERM EXIT

node -e "import('./mo_docs/server.js').then(({ default: app }) => app.listen(3001, () => console.log('mo_docs: http://localhost:3001/api/results')))" &
pids+=("$!")

node "death_cert/server.js" &
pids+=("$!")
echo "death_cert: http://localhost:3002/api/death"

node "forwarding/server.js" &
pids+=("$!")
echo "forwarding: http://localhost:3003/api/forwarding"

echo "Все серверы запущены. Для остановки нажми Ctrl+C."

wait -n "${pids[@]}"
