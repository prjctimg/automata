#!/bin/bash

set -e

echo "🚀 Starting p5.js documentation generation... 📚✨"

OUTPUT_DIR="doc"
ASSETS_DIR="assets"

# Ensure output directories exist
mkdir -p "$OUTPUT_DIR"
mkdir -p "$ASSETS_DIR"

# Clean up existing documentation files
echo "🧹 Cleaning up existing documentation..."
rm -f "$OUTPUT_DIR"/p5-*.txt "$OUTPUT_DIR"/p5.md

echo "📖 Extracting documentation from p5.js source... 🔍📦"

P5_SOURCE="${P5_SOURCE_DIR:-/tmp/p5.js}"

# Get p5 version from p5.js source
P5_VERSION=$(cat "$P5_SOURCE/package.json" | grep '"version":' | sed -E 's/.*"([^"]+)".*/\1/' || echo "2.2.3")
TIMESTAMP=$(date -Iseconds | sed 's/T/ /' | sed 's/\..*//')

echo "📦 p5.js version: $P5_VERSION 🎯"
echo "📅 Last updated: $TIMESTAMP ⏰"

# Check that documentation data.json exists
DOCS_DATA="$P5_SOURCE/docs/data.json"
if [ ! -f "$DOCS_DATA" ]; then
	echo "❌ p5.js docs/data.json not found. Run documentation build first. 📂❌"
	exit 1
fi

echo "📝 Generating documentation for all modules..."
if P5_SOURCE_DIR="$P5_SOURCE" node scripts/p5/docs.js; then
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
