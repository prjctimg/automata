#!/bin/bash

set -e

echo "🚀 Starting p5.js TypeScript definitions generation... 📝🔧"

# Ensure output directory exists
mkdir -p assets/types

echo "📦 Generating TypeScript definitions..."
P5_SOURCE="${P5_SOURCE_DIR:-/tmp/p5.js}"
if P5_SOURCE_DIR="$P5_SOURCE" node scripts/p5/types.js; then
	echo "✅ Types generation successful"

	# Validate generated types
	if [ -f "assets/types/p5.d.ts" ] && [ -s "assets/types/p5.d.ts" ]; then
		TYPES_SIZE=$(stat -c%s "assets/types/p5.d.ts")
		echo "✅ Types validation passed (${TYPES_SIZE} bytes)"
	else
		echo "❌ Types validation failed - file missing or empty"
		exit 1
	fi
else
	echo "❌ Types generation failed"
	exit 1
fi

echo "🎉 TypeScript definitions generation completed successfully!"
echo "📁 Generated files:"
ls -la assets/types/
