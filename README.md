# udp2raw-tunnel-openwrt

OpenWrt packages for [udp2raw-tunnel](https://github.com/wangyu-/udp2raw-tunnel) —
a tunnel that turns UDP traffic into encrypted FakeTCP/UDP/ICMP traffic using raw
sockets, so it can pass through firewalls that block UDP.

## What's inside

| Package            | Description                                                        |
|--------------------|--------------------------------------------------------------------|
| `udp2raw`          | `/usr/bin/udp2raw` binary + procd init script + UCI config + `setcap`. |
| `luci-app-udp2raw` | LuCI web UI under **Services → udp2raw** (client-side JS).         |

## Features

- Runs as `nobody:nogroup` via Linux file capabilities — no root required.
- Optional `auto_firewall` UCI flag: the init script generates and applies
  the iptables rule itself (since udp2raw can't use `--auto-rule` under non-root).
- Hybrid LuCI form: common udp2raw flags as structured fields with validation,
  plus an `extra_args` textarea for anything else.
- Pre-built packages for **OpenWrt 24.10** (`.ipk`) and **25.12** (`.apk`).
  Default target is `aarch64_cortex-a53`; others are commented out in CI.

## Install

Run on the router:

```sh
sh -c "$(wget -qO- https://raw.githubusercontent.com/win0err/udp2raw-tunnel-openwrt/main/install.sh)"
```

The script detects OpenWrt version and architecture, downloads matching
packages from the [Releases](../../releases) page, and installs them. LuCI is
skipped automatically on headless routers.

### Manual install

Download the matching files from [Releases](../../releases) and:

```sh
# OpenWrt 24.10 (opkg)
opkg install udp2raw_*_<arch>.ipk luci-app-udp2raw*.ipk

# OpenWrt 25.12 (apk, packages are unsigned)
apk add --allow-untrusted udp2raw-*.apk luci-app-udp2raw-*.apk
```

## Configure

- **LuCI:** Services → udp2raw.
- **CLI:** edit `/etc/config/udp2raw`, then `/etc/init.d/udp2raw restart`.

For `faketcp` mode you typically need an iptables rule so the kernel does not
RST incoming SYN-ACKs — enable `option auto_firewall '1'` in UCI and the init
script will add and remove the rule itself, based on raw mode, remote address
and port. On OpenWrt 22.03+ install `iptables-nft` for compatibility with fw4.

## Build

CI builds both packages via the OpenWrt SDK Docker image. See
[`.github/workflows/build.yml`](.github/workflows/build.yml). The build matrix
covers OpenWrt 24.10 / 25.12 for `aarch64_cortex-a53`; other architectures
(ARM64, ARM32, MIPS, x86, RISC-V) are commented out.

For local builds, register this repo as a feed in your OpenWrt SDK tree:

```sh
echo "src-link udp2raw /path/to/udp2raw-tunnel-openwrt" >> feeds.conf
./scripts/feeds update udp2raw
./scripts/feeds install udp2raw luci-app-udp2raw
make package/udp2raw/udp2raw/compile V=s
make package/udp2raw/luci-app-udp2raw/compile V=s
```
