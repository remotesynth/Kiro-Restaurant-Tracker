#!/bin/bash

# Build script for Lambda functions
echo "Building Lambda functions..."

# Create dist directory if it doesn't exist
mkdir -p dist/lambdas/auth
mkdir -p dist/lambdas/restaurants
mkdir -p dist/lambdas/reviews

# Compile TypeScript files
echo "Compiling TypeScript files..."
npm run build

# Copy compiled JavaScript files to the appropriate directories
echo "Copying compiled JavaScript files..."

# Auth lambdas
cp lib/lambdas/auth/*.js dist/lambdas/auth/

# Restaurant lambdas
cp lib/lambdas/restaurants/*.js dist/lambdas/restaurants/

# Review lambdas
cp lib/lambdas/reviews/*.js dist/lambdas/reviews/

echo "Lambda functions built successfully!"