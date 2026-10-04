#!/bin/bash
# Keeps the Next.js dev server alive across shell sessions.
cd /home/z/my-project
while true; do
  echo "[watcher] starting dev server at $(date -Iseconds)" >> /home/z/my-project/dev-watcher.log
  node node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  EXIT=$?
  echo "[watcher] dev server exited with code $EXIT at $(date -Iseconds), restarting in 2s..." >> /home/z/my-project/dev-watcher.log
  sleep 2
done
