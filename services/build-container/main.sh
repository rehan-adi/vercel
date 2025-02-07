#!/bin/bash

echo "🚀 Starting build process..."

# Check if REPOSITORY_URL is set
if [ -z "$REPOSITORY_URL" ]; then
    echo "❌ Error: REPOSITORY_URL is not set"
    exit 1
fi

echo "🔗 Cloning repository: $REPOSITORY_URL"

# Clone the repository
git clone "$REPOSITORY_URL" /home/app/output 2>&1 | tee /home/app/git_clone.log
CLONE_EXIT_CODE=$?

if [ $CLONE_EXIT_CODE -ne 0 ]; then
    echo "❌ Git clone failed with exit code $CLONE_EXIT_CODE"
    exit 1
fi

echo "✅ Repository cloned successfully!"

# Run the build process
exec node index.js
