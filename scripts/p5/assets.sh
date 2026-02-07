#!/bin/bash

set -e

echo "🚀 Starting p5.js modules fetching from GitHub releases... 📦🔧"

# Ensure output directory exists
mkdir -p assets/libs

OUTPUT_DIR="assets/libs"

# Get the latest p5.js version
echo "🔍 Getting p5.js latest release tag..."
P5_VERSION=$(curl -s https://api.github.com/repos/processing/p5.js/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$P5_VERSION" ]; then
	echo "❌ Failed to get p5.js version"
	exit 1
fi

echo "📦 Found p5.js version: $P5_VERSION"

# Download p5.js (try non-minified first, then fallbacks)
echo "📥 Downloading p5.js..."
P5_DOWNLOAD_URLS=(
	"https://github.com/processing/p5.js/releases/download/${P5_VERSION}/p5.js"
	"https://github.com/processing/p5.js/releases/download/${P5_VERSION}/lib/p5.js"
	"https://github.com/processing/p5.js/releases/download/${P5_VERSION}/p5.min.js"
)

P5_DOWNLOADED=false
for URL in "${P5_DOWNLOAD_URLS[@]}"; do
	if curl -L -f -o "${OUTPUT_DIR}/p5.js" "$URL" 2>/dev/null; then
		echo "✅ Downloaded p5.js from: $URL"
		P5_DOWNLOADED=true
		break
	else
		echo "⚠️ Failed to download from: $URL"
	fi
done

if [ "$P5_DOWNLOADED" = false ]; then
	echo "❌ Failed to download p5.js from any source"
	exit 1
fi

# Try to get p5.sound.js version
echo "🔍 Getting p5.sound.js latest release tag..."
P5_SOUND_VERSION=$(curl -s https://api.github.com/repos/processing/p5.sound.js/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/' || echo "")

if [ -n "$P5_SOUND_VERSION" ]; then
	echo "📦 Found p5.sound.js version: $P5_SOUND_VERSION"

	# Download p5.sound.js (try non-minified first, then fallbacks)
	echo "📥 Downloading p5.sound.js..."
	P5_SOUND_DOWNLOAD_URLS=(
		"https://github.com/processing/p5.sound.js/releases/download/${P5_SOUND_VERSION}/p5.sound.js"
		"https://github.com/processing/p5.sound.js/releases/download/${P5_SOUND_VERSION}/lib/p5.sound.js"
		"https://github.com/processing/p5.sound.js/releases/download/${P5_SOUND_VERSION}/p5.sound.min.js"
	)

	P5_SOUND_DOWNLOADED=false
	for URL in "${P5_SOUND_DOWNLOAD_URLS[@]}"; do
		if curl -L -f -o "${OUTPUT_DIR}/p5.sound.js" "$URL" 2>/dev/null; then
			echo "✅ Downloaded p5.sound.js from: $URL"
			P5_SOUND_DOWNLOADED=true
			break
		else
			echo "⚠️ Failed to download p5.sound.js from: $URL"
		fi
	done

	if [ "$P5_SOUND_DOWNLOADED" = false ]; then
		echo "⚠️ Could not download p5.sound.js, but continuing..."
	fi
else
	echo "⚠️ Could not get p5.sound.js version, skipping..."
fi

# Validate downloaded modules
if [ -f "${OUTPUT_DIR}/p5.js" ] && [ -s "${OUTPUT_DIR}/p5.js" ]; then
	MODULES_SIZE=$(stat -c%s "${OUTPUT_DIR}/p5.js")
	echo "✅ Modules validation passed (${MODULES_SIZE} bytes)"
else
	echo "❌ Modules validation failed - file missing or empty"
	exit 1
fi

echo "🎉 Modules fetching completed successfully!"
echo "📁 Generated files:"
ls -la assets/libs/
