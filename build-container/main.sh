#!/bin/bash

export REPOSITORY_URL="$REPOSITORY_URL"

if [ -z "$REPOSITORY_URL" ]; then
    echo "❌ Error: REPOSITORY_URL is not set"
    exit 1
fi

git clone "$REPOSITORY_URL" /home/app/output || { echo "❌ Git clone failed"; exit 1; }

exec node index.js
