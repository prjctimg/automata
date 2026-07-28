#!/bin/bash

set -euo pipefail

echo "🚀 Starting p5.js TypeScript definitions generation..."

REPO_ROOT="${GITHUB_WORKSPACE:-}"
if [ -z "$REPO_ROOT" ]; then
	REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi
cd "$REPO_ROOT"

mkdir -p assets/types

WORK_DIR="${P5_TYPES_WORK_DIR:-/tmp/p5-types-pack}"
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"

P5_SPEC="${P5_NPM_SPEC:-p5@latest}"

echo "📦 Fetching types from npm package: $P5_SPEC"
(
	cd "$WORK_DIR"
	npm pack "$P5_SPEC" --silent > pack-name.txt
)

TARBALL_NAME=$(tr -d '\r\n' <"$WORK_DIR/pack-name.txt")
TARBALL="$WORK_DIR/$TARBALL_NAME"

if [ -z "$TARBALL_NAME" ] || [ ! -f "$TARBALL" ]; then
	echo "❌ npm pack failed for $P5_SPEC"
	exit 1
fi

echo "📂 Extracting $TARBALL_NAME..."
tar -xzf "$TARBALL" -C "$WORK_DIR"

TYPES_SRC="$WORK_DIR/package/types"
if [ ! -f "$TYPES_SRC/p5.d.ts" ] || [ ! -f "$TYPES_SRC/global.d.ts" ]; then
	echo "❌ Expected types not found in npm package"
	ls -la "$WORK_DIR/package" || true
	ls -la "$TYPES_SRC" || true
	exit 1
fi

P5_VERSION=$(node -p "require('$WORK_DIR/package/package.json').version")
echo "📌 p5 version: $P5_VERSION"

echo "📦 Bundling TypeScript definitions..."
if P5_TYPES_DIR="$TYPES_SRC" P5_VERSION="$P5_VERSION" node scripts/p5/types.js; then
	echo "✅ Types generation successful"

	if [ -f "assets/types/p5.d.ts" ] && [ -s "assets/types/p5.d.ts" ]; then
		TYPES_SIZE=$(stat -c%s "assets/types/p5.d.ts")
		echo "✅ Types validation passed (${TYPES_SIZE} bytes)"
		if [ -n "${GITHUB_ENV:-}" ]; then
			echo "P5_VERSION=$P5_VERSION" >>"$GITHUB_ENV"
		fi
		echo "$P5_VERSION" >assets/types/.p5-version
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
