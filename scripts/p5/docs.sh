#!/bin/bash

set -euo pipefail

echo "🚀 Starting p5.js documentation generation..."

OUTPUT_DIR="doc"
mkdir -p "$OUTPUT_DIR"

echo "🧹 Cleaning up existing API documentation..."
# Preserve plugin-owned help if present locally
find "$OUTPUT_DIR" -maxdepth 1 -type f -name 'p5-*.txt' ! -name 'p5-nvim.txt' -delete
rm -f "$OUTPUT_DIR/p5.md"

P5_SOURCE="${P5_SOURCE_DIR:-/tmp/p5.js}"

if [ ! -d "$P5_SOURCE" ]; then
	echo "❌ p5.js source not found at $P5_SOURCE"
	exit 1
fi

P5_VERSION=$(node -p "require('$P5_SOURCE/package.json').version" 2>/dev/null || echo "${P5_VERSION:-unknown}")
TIMESTAMP=$(date -Iseconds | sed 's/T/ /' | sed 's/\..*//')

echo "📦 p5.js version: $P5_VERSION"
echo "📅 Last updated: $TIMESTAMP"

DOCS_DATA="$P5_SOURCE/docs/data.json"
if [ ! -f "$DOCS_DATA" ]; then
	echo "❌ p5.js docs/data.json not found. Run documentation build first."
	exit 1
fi

echo "📝 Generating documentation for all modules..."
if P5_SOURCE_DIR="$P5_SOURCE" P5_VERSION="$P5_VERSION" node scripts/p5/docs.js; then
	echo "✅ Documentation generation successful"
else
	echo "❌ Documentation generation failed"
	exit 1
fi

echo "📚 Generated documentation files:"
ls -la "$OUTPUT_DIR"/p5-*.txt 2>/dev/null | head -20 || true

API_COUNT=$(find "$OUTPUT_DIR" -maxdepth 1 -type f -name 'p5-*.txt' ! -name 'p5-nvim.txt' | wc -l)
if [ "$API_COUNT" -gt 0 ]; then
	echo "✅ Documentation validation passed ($API_COUNT API help files)"
else
	echo "❌ Documentation validation failed - no API help files generated"
	exit 1
fi

echo "🎉 Documentation generation completed successfully!"
echo "📁 Generated $API_COUNT manpages in $OUTPUT_DIR/"
