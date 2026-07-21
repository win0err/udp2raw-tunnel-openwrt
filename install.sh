#!/bin/sh
# Downloads and installs udp2raw + luci-app-udp2raw for the running
# OpenWrt version and architecture. Intended to be run on the router itself.
#
# Usage:
#   sh -c "$(wget -qO- https://raw.githubusercontent.com/win0err/udp2raw-tunnel-openwrt/main/install.sh)"
#
# Or after downloading manually:
#   sh install.sh

set -eu

REPO="win0err/udp2raw-tunnel-openwrt"

# Sanity check: must be OpenWrt.
if [ ! -f /etc/os-release ]; then
    echo "Error: /etc/os-release not found. This script must be run on OpenWrt." >&2
    exit 1
fi

. /etc/os-release

ARCH="${OPENWRT_ARCH:-}"
VERSION="${VERSION_ID:-}"

[ -n "$ARCH" ]    || { echo "Error: OPENWRT_ARCH is not set" >&2; exit 1; }
[ -n "$VERSION" ] || { echo "Error: VERSION_ID is not set" >&2; exit 1; }

# Map OpenWrt version to a release tag and package format.
# Both point releases (24.10.7) and snapshots (24.10-snapshot) of the same
# branch map to the latest stable tag of that branch -- application packages
# are compatible within a major.minor.
case "$VERSION" in
    24.10*)
        RELEASE_TAG="v24.10.7"
        EXT="ipk"
        PKGINSTALL="opkg update && opkg install"
        ;;
    25.12*)
        RELEASE_TAG="v25.12.5"
        EXT="apk"
        # CI packages are unsigned; --allow-untrusted bypasses the check.
        PKGINSTALL="apk update && apk add --allow-untrusted"
        ;;
    snapshot|SNAPSHOT)
        # Master snapshot. OpenWrt master switched to apk in 25.x cycle, so
        # assume apk and the latest stable release.
        RELEASE_TAG="v25.12.5"
        EXT="apk"
        PKGINSTALL="apk update && apk add --allow-untrusted"
        ;;
    *)
        echo "Error: unsupported OpenWrt version $VERSION" >&2
        echo "Supported: 24.10.x (.ipk), 25.12.x (.apk), snapshot (.apk)" >&2
        exit 1
        ;;
esac

echo "=== udp2raw installer ==="
echo "OpenWrt: $VERSION"
echo "Arch:    $ARCH"
echo "Release: $RELEASE_TAG ($EXT)"
echo ""

# Pick a download tool.
if command -v wget >/dev/null 2>&1; then
    FETCH="wget -qO-"
    DOWNLOAD='wget -qO'
elif command -v curl >/dev/null 2>&1; then
    FETCH="curl -fsSL"
    DOWNLOAD='curl -fsSL -o'
else
    echo "Error: neither wget nor curl is installed" >&2
    exit 1
fi

if ! command -v jsonfilter >/dev/null 2>&1; then
    echo "Error: jsonfilter not found (should be part of OpenWrt base)" >&2
    exit 1
fi

# Fetch release info from GitHub.
API_URL="https://api.github.com/repos/${REPO}/releases/tags/${RELEASE_TAG}"
echo "Fetching release info..."
JSON=$($FETCH "$API_URL") || {
    echo "Error: failed to fetch $API_URL" >&2
    echo "(rate-limited by GitHub? Try again in a few minutes.)" >&2
    exit 1
}

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
printf '%s' "$JSON" > "$TMP/release.json"

# Build "name<TAB>url" pairs for all assets in the release.
jsonfilter -i "$TMP/release.json" -e '@.assets[*].name'                 > "$TMP/names"
jsonfilter -i "$TMP/release.json" -e '@.assets[*].browser_download_url' > "$TMP/urls"
paste "$TMP/names" "$TMP/urls" > "$TMP/combined"

# Find the assets we need.
UDP2RAW_URL=""
LUCI_URL=""

while IFS="$(printf '\t')" read -r name url; do
    # Skip wrong-format files.
    case "$name" in
        *.$EXT) ;;
        *) continue ;;
    esac

    case "$name" in
        udp2raw-*)
            # apk: udp2raw-<ver>-r<rel>.<arch>.apk
            # (must exclude luci-app-udp2raw which starts with 'luci')
            case "$name" in
                *-${ARCH}.$EXT)
                    UDP2RAW_URL="$url"
                    ;;
            esac
            ;;
        udp2raw_*)
            # ipk: udp2raw_<ver>-<rel>_<arch>.ipk
            case "$name" in
                *_${ARCH}.$EXT)
                    UDP2RAW_URL="$url"
                    ;;
            esac
            ;;
        luci-app-udp2raw*)
            LUCI_URL="$url"
            ;;
    esac
done < "$TMP/combined"

[ -n "$UDP2RAW_URL" ] || {
    echo "Error: no udp2raw package for arch=$ARCH in $RELEASE_TAG" >&2
    echo "Assets in this release:" >&2
    sed 's/^/  /' "$TMP/names" >&2
    exit 1
}

# Skip luci-app-udp2raw if LuCI itself is not installed (avoid pulling luci-base
# onto a headless router).
if [ -n "$LUCI_URL" ] && [ ! -d /usr/share/luci ]; then
    echo "Note: luci-base not installed; skipping luci-app-udp2raw."
    echo "      Install LuCI first if you want the web UI."
    LUCI_URL=""
fi

# Download.
echo "Downloading udp2raw..."
$DOWNLOAD "$TMP/udp2raw.$EXT" "$UDP2RAW_URL"

if [ -n "$LUCI_URL" ]; then
    echo "Downloading luci-app-udp2raw..."
    $DOWNLOAD "$TMP/luci-app-udp2raw.$EXT" "$LUCI_URL"
fi

# Install.
echo ""
echo "Installing..."
eval "$PKGINSTALL "$TMP/udp2raw.$EXT""
[ -n "$LUCI_URL" ] && eval "$PKGINSTALL \"$TMP/luci-app-udp2raw.$EXT\""

echo ""
echo "Done."
echo "Configure tunnels in LuCI: Services -> udp2raw."
echo "Or edit /etc/config/udp2raw manually."

# Hint about iptables for faketcp firewall rules.
if ! command -v iptables >/dev/null 2>&1; then
    echo ""
    echo "Hint: 'iptables' is not installed. For faketcp-mode firewall rules:"
    case "$EXT" in
        ipk) echo "  opkg install iptables-nft" ;;
        apk) echo "  apk add iptables-nft" ;;
    esac
fi
