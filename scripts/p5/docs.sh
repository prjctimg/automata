#!/bin/bash

set -e

echo "🚀 Starting p5.js documentation generation... 📚✨"

OUTPUT_DIR="doc"
ASSETS_DIR="assets"

# Ensure output directories exist
mkdir -p "$OUTPUT_DIR"
mkdir -p "$ASSETS_DIR"

echo "📖 Extracting documentation from @types/p5... 🔍📦"

# Get p5 version from package.json
P5_VERSION=$(cat node_modules/@types/p5/package.json | grep '"version":' | sed -E 's/.*"([^"]+)".*/\1/' || echo "1.7.7")
TIMESTAMP=$(date -Iseconds | sed 's/T/ /' | sed 's/\..*//')

echo "📦 p5.js version: $P5_VERSION 🎯"
echo "📅 Last updated: $TIMESTAMP ⏰"

# Check if types file exists
TYPES_FILE="$ASSETS_DIR/types/p5.d.ts"
if [ ! -f "$TYPES_FILE" ]; then
	echo "❌ TypeScript definitions not found. Run types generation first. 📂❌"
	exit 1
fi

echo "📝 Generating documentation for all modules..."
if node scripts/p5/docs.js; then
	echo "✅ Documentation generation successful"
else
	echo "❌ Documentation generation failed"
	exit 1
fi

echo "📚 Generated documentation files:"
ls -la "$OUTPUT_DIR"/p5-*.txt | head -10

if [ $(ls "$OUTPUT_DIR"/p5-*.txt 2>/dev/null | wc -l) -gt 0 ]; then
	echo "✅ Documentation validation passed"
else
	echo "❌ Documentation validation failed - no files generated"
	exit 1
fi

echo "🎉 Documentation generation completed successfully!"
echo "📁 Generated $(ls "$OUTPUT_DIR"/p5-*.txt 2>/dev/null | wc -l) manpages in $OUTPUT_DIR/"
