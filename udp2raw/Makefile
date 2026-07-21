#
# Copyright (c) 2017 Yu Wang <wangyucn@gmail.com>
# Copyright (C) 2026 Sergei Kolesnikov <sergei@kolesnikov.se>
#
# This is free software, licensed under the MIT License.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=udp2raw
# Note: APK (OpenWrt snapshots) does not allow hyphens in the version body,
# only dots / digits / letters. Use the compact YYYYMMDD form.
PKG_VERSION:=20220126
PKG_RELEASE:=1

PKG_SOURCE_PROTO:=git
PKG_SOURCE_URL:=https://github.com/wangyu-/udp2raw-tunnel.git
PKG_SOURCE_VERSION:=165cabb5a3bae9d561e89e577ccd9cf7c125d68f
PKG_SOURCE_DATE:=2022-01-26
PKG_SOURCE_SUBDIR:=$(PKG_NAME)-$(PKG_VERSION)
PKG_SOURCE:=$(PKG_NAME)-$(PKG_VERSION)-$(PKG_SOURCE_VERSION).tar.xz
# PKG_MIRROR_HASH: computed automatically on the first build, see README.

PKG_LICENSE:=MIT
PKG_LICENSE_FILES:=LICENSE
PKG_MAINTAINER:=Sergei Kolesnikov <sergei@kolesnikov.se>

PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)-$(PKG_VERSION)
PKG_BUILD_PARALLEL:=1

include $(INCLUDE_DIR)/package.mk

define Package/udp2raw
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=Routing and Redirection
  TITLE:=Tunnel which turns UDP Traffic into Encrypted FakeTCP/UDP/ICMP Traffic
  URL:=https://github.com/wangyu-/udp2raw-tunnel
  DEPENDS:=+libcap-bin
endef

define Package/udp2raw/description
  udp2raw-tunnel is a tunnel which turns UDP Traffic into Encrypted
  FakeTCP/UDP/ICMP Traffic by using Raw Socket.

  This package provides:
    * /usr/bin/udp2raw binary (statically linked)
    * procd init script /etc/init.d/udp2raw
    * default UCI config /etc/config/udp2raw
    * uci-defaults script that grants file capabilities to the binary

  Tunnels run as nobody:nogroup using cap_net_raw, cap_net_admin and
  cap_net_bind_service -- root is not required.
endef

# Build with the cross2 target from the upstream makefile (static linking).
MAKE_FLAGS += cross2

# Replace cc_cross with the toolchain's cross-compiler and bake the version
# (upstream calls `git rev-parse HEAD`, but the .git directory is absent in the tarball).
define Build/Configure
	$(call Build/Configure/Default)
	$(SED) 's/cc_cross[[:space:]]*=.*/cc_cross=$(TARGET_CXX)/' \
		-e 's/\\".*shell git rev-parse HEAD.*\\"/\\"$(PKG_SOURCE_VERSION)\\"/' \
		$(PKG_BUILD_DIR)/makefile
endef

define Package/udp2raw/install
	# Binary
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/udp2raw_cross $(1)/usr/bin/udp2raw
	# Service files
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_DATA) ./files/etc/config/udp2raw $(1)/etc/config/udp2raw
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/udp2raw $(1)/etc/init.d/udp2raw
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/etc/uci-defaults/udp2raw-setcap $(1)/etc/uci-defaults/udp2raw-setcap
endef

define Package/udp2raw/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

# Suppress all output -- procd may emit non-fatal messages on enable/start.
exec >/dev/null 2>&1

[ -x /etc/init.d/udp2raw ] && /etc/init.d/udp2raw enable
[ -x /etc/init.d/udp2raw ] && /etc/init.d/udp2raw start

exit 0
endef

define Package/udp2raw/prerm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0

# Suppress all output. procd prints "Command failed: Not found" when
# stopping a service that isn't currently running, which is normal during
# reinstall and not an actual error.
exec >/dev/null 2>&1

[ -x /etc/init.d/udp2raw ] && /etc/init.d/udp2raw stop
[ -x /etc/init.d/udp2raw ] && /etc/init.d/udp2raw disable

exit 0
endef

$(eval $(call BuildPackage,udp2raw))
