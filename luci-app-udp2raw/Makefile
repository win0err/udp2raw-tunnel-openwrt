#
# Copyright (C) 2026 Sergei Kolesnikov <sergei@kolesnikov.se>
#
# This is free software, licensed under the GNU General Public License v3.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-udp2raw
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=GPL-3.0-or-later
PKG_MAINTAINER:=Sergei Kolesnikov <sergei@kolesnikov.se>
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-udp2raw
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=LuCI support for udp2raw
  DEPENDS:=+luci-base +udp2raw
  PKGARCH:=all
endef

define Package/luci-app-udp2raw/description
  LuCI web interface for managing udp2raw tunnels configured via the
  /etc/config/udp2raw UCI file.  Client-side JavaScript view plus a small
  rpcd backend (ubus object "luci.udp2raw") that powers the Service
  Control block on the main page.

  Depends on the udp2raw package which provides the binary, init
  script and UCI defaults.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
endef

define Build/Configure
endef

define Build/Compile
endef

define Package/luci-app-udp2raw/install
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-udp2raw.json \
		$(1)/usr/share/luci/menu.d/luci-app-udp2raw.json
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-udp2raw.json \
		$(1)/usr/share/rpcd/acl.d/luci-app-udp2raw.json
	# rpcd backend for the Service Control block (ubus object "luci.udp2raw").
	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_BIN) ./root/usr/libexec/rpcd/luci.udp2raw \
		$(1)/usr/libexec/rpcd/luci.udp2raw
	# One-shot post-install hook: clear LuCI caches + reload rpcd.
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./root/etc/uci-defaults/40_luci-udp2raw \
		$(1)/etc/uci-defaults/40_luci-udp2raw
	# LuCI view + reusable status module.
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/udp2raw
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/udp2raw/udp2raw.js \
		$(1)/www/luci-static/resources/view/udp2raw/udp2raw.js
	$(INSTALL_DIR) $(1)/www/luci-static/resources/udp2raw
	$(INSTALL_DATA) ./htdocs/luci-static/resources/udp2raw/status.js \
		$(1)/www/luci-static/resources/udp2raw/status.js
endef

define Package/luci-app-udp2raw/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] && exit 0
which luci-reload >/dev/null 2>&1 && luci-reload >/dev/null 2>&1
exit 0
endef

$(eval $(call BuildPackage,luci-app-udp2raw))
