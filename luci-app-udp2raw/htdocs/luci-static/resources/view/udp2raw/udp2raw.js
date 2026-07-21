"use strict";
"require form";
"require rpc";
"require udp2raw.status as ud";
/* globals ud */

// Service Control lives in its own module (udp2raw/status.js) and is rendered
// at the top of the page via Promise.all([status.render(), m.render()]).
// All start/stop/restart/enable/disable calls go through the rpcd backend at
// /usr/libexec/rpcd/luci.udp2raw (ubus object "luci.udp2raw"), not through
// fs.exec of /etc/init.d/udp2raw -- that way the LuCI ACL only needs to
// whitelist the ubus object, not arbitrary file execution.

var pkg = ud.pkg;

return L.view.extend({
  // After Save & Apply, restart the service via the rpcd backend so any
  // added/changed tunnels take effect.  Mirrors the explicit Restart button.
  handleSaveApply: function (ev, mode) {
    return this.super("handleSaveApply", arguments).then(
      L.bind(function () {
        return ud.RPC.setInitAction(pkg.Name, "restart");
      }, this),
    );
  },

  render: function () {
    var status, m, s, o;
    status = new ud.status();

    m = new form.Map(
      "udp2raw",
      _("udp2raw"),
      _(
        "Tunnel which turns UDP traffic into encrypted FakeTCP/UDP/ICMP traffic.",
      ) +
        _(
          ' Click <b>Add</b> to create a new tunnel (enter a name like "client1"); click a row to edit it.',
        ),
    );

    s = m.section(form.GridSection, "udp2raw", _("Tunnels"));
    s.addremove = true;
    s.anonymous = false;
    s.nodescriptions = true;

    // Tabs in the modal edit dialog.
    s.tab("basic", _("Basic Settings"));
    s.tab("advanced", _("Advanced Settings"));

    // Single visible column in the list: assembled CLI.
    // Only non-default values are shown; required fields always appear.
    o = s.option(form.DummyValue, "_summary", _("Config"));
    o.textvalue = function (sid) {
      var get = function (opt, def) {
        var v = this.section.cfgvalue(sid, opt);
        return v === undefined || v === null || v === "" ? def : v;
      }.bind(this);

      if (get("disabled") === "1") return "<em>(disabled)</em>";

      var parts = [];
      parts.push("-" + get("mode", "c"));
      var lp = get("local_port");
      if (lp) parts.push("-l " + get("local_addr", "0.0.0.0") + ":" + lp);
      var ra = get("remote_addr"),
        rp = get("remote_port");
      if (ra && rp) parts.push("-r " + ra + ":" + rp);
      if (get("password")) parts.push("-k ***");

      // Only show non-default values to keep the summary readable.
      // udp2raw defaults: raw-mode=faketcp, cipher-mode=aes128cbc, auth-mode=md5, log-level=4.
      var extra = [];
      if (get("raw_mode") && get("raw_mode") !== "faketcp")
        extra.push("--raw-mode " + get("raw_mode"));
      if (get("cipher_mode") && get("cipher_mode") !== "aes128cbc")
        extra.push("--cipher-mode " + get("cipher_mode"));
      if (get("auth_mode") && get("auth_mode") !== "md5")
        extra.push("--auth-mode " + get("auth_mode"));
      if (get("auto_firewall") === "1") extra.push("[auto-fw]");
      if (get("extra_args")) extra.push(get("extra_args"));
      if (extra.length)
        parts.push('<span style="color:#888">' + extra.join(" ") + "</span>");

      return "<code>" + parts.join(" ") + "</code>";
    };
    o.rawHTML = true;

    // ===== Basic tab =====
    o = s.taboption("basic", form.Flag, "disabled", _("Disabled"));
    o.modalonly = true;
    o.rmempty = false;

    o = s.taboption(
      "basic",
      form.ListValue,
      "mode",
      _("Mode"),
      _(
        "run as client: -c -l local_listen_ip:local_port -r server_address:server_port; run as server: -s -l server_listen_ip:server_port -r remote_address:remote_port",
      ),
    );
    o.value("c", _("Client"));
    o.value("s", _("Server"));
    o.default = "c";
    o.rmempty = false;
    o.modalonly = true;

    o = s.taboption(
      "basic",
      form.Value,
      "local_addr",
      _("Local IP"),
      _(
        "local_listen_ip (client) or server_listen_ip (server). Default: 0.0.0.0",
      ),
    );
    o.placeholder = "0.0.0.0";
    o.datatype = "ipaddr";
    o.modalonly = true;

    o = s.taboption(
      "basic",
      form.Value,
      "local_port",
      _("Local Port"),
      _("local_listen_port (client) or server_listen_port (server)"),
    );
    o.datatype = "port";
    o.rmempty = false;
    o.modalonly = true;

    o = s.taboption(
      "basic",
      form.Value,
      "remote_addr",
      _("Remote IP/Domain"),
      _("server_address (client) or remote_address (server)"),
    );
    o.datatype = "host";
    o.rmempty = false;
    o.modalonly = true;

    o = s.taboption(
      "basic",
      form.Value,
      "remote_port",
      _("Remote Port"),
      _("server_port (client) or remote_port (server)"),
    );
    o.datatype = "port";
    o.rmempty = false;
    o.modalonly = true;

    o = s.taboption(
      "basic",
      form.Value,
      "password",
      _("Password"),
      _('password to gen symmetric key, default: "secret key"'),
    );
    o.password = true;
    o.placeholder = _("secret key");
    o.modalonly = true;

    o = s.taboption(
      "basic",
      form.ListValue,
      "raw_mode",
      _("Raw Mode"),
      _(
        "available values:faketcp(default),udp,icmp and easy-faketcp. These options must be the same on both sides.",
      ),
    );
    o.value("", _("— (default: faketcp) —"));
    o.value("faketcp", "faketcp");
    o.value("udp", "udp");
    o.value("icmp", "icmp");
    o.value("easy-faketcp", "easy-faketcp");
    o.optional = true;
    o.modalonly = true;

    o = s.taboption(
      "basic",
      form.ListValue,
      "cipher_mode",
      _("Cipher Mode"),
      _(
        "available values:aes128cfb,aes128cbc(default),xor,none. These options must be the same on both sides.",
      ),
    );
    o.value("", _("— (default: aes128cbc) —"));
    o.value("aes128cbc", "aes128cbc");
    o.value("aes128cfb", "aes128cfb");
    o.value("xor", "xor");
    o.value("none", "none");
    o.optional = true;
    o.modalonly = true;

    o = s.taboption(
      "basic",
      form.ListValue,
      "auth_mode",
      _("Auth Mode"),
      _(
        "available values:hmac_sha1,md5(default),crc32,simple,none. These options must be the same on both sides.",
      ),
    );
    o.value("", _("— (default: md5) —"));
    o.value("md5", "md5");
    o.value("hmac_sha1", "hmac_sha1");
    o.value("crc32", "crc32");
    o.value("simple", "simple");
    o.value("none", "none");
    o.optional = true;
    o.modalonly = true;

    // ===== Advanced tab =====
    o = s.taboption(
      "advanced",
      form.Value,
      "source_ip",
      _("Source IP"),
      _("force source-ip for raw socket (client only)"),
    );
    o.datatype = "ipaddr";
    o.depends("mode", "c");
    o.modalonly = true;

    o = s.taboption(
      "advanced",
      form.Value,
      "source_port",
      _("Source Port"),
      _(
        "force source-port for raw socket, tcp/udp only. This option disables port changing while re-connecting.",
      ),
    );
    o.datatype = "port";
    o.depends("mode", "c");
    o.modalonly = true;

    o = s.taboption(
      "advanced",
      form.Value,
      "sock_buf",
      _("Socket Buffer (KB)"),
      _("buf size for socket, >=10 and <=10240, unit:kbyte, default:1024"),
    );
    o.datatype = "range(10,10240)";
    o.placeholder = "1024";
    o.modalonly = true;

    o = s.taboption(
      "advanced",
      form.Value,
      "dev",
      _("Bind to Device"),
      _("bind raw socket to a device, not necessary but improves performance"),
    );
    o.datatype = "network";
    o.modalonly = true;

    o = s.taboption(
      "advanced",
      form.ListValue,
      "seq_mode",
      _("Seq Mode"),
      _(
        "seq increase mode for faketcp: 0:static header; 1:increase seq for every packet; 2:increase seq randomly; 3:simulate an almost real seq/ack procedure(default); 4:similar to 3,but do not consider TCP Option Window_Scale",
      ),
    );
    o.value("", _("— (default: 3) —"));
    o.value("0", _("0: static header"));
    o.value("1", _("1: increase seq"));
    o.value("2", _("2: random seq"));
    o.value("3", _("3: real seq/ack"));
    o.value("4", _("4: like 3, no TCP option"));
    o.optional = true;
    o.modalonly = true;

    o = s.taboption(
      "advanced",
      form.Value,
      "lower_level",
      _("Lower Level"),
      _(
        "send packets at OSI level 2, format:'if_name#dest_mac_adress' ie:'eth0#00:23:45:67:89:b9'. or try '--lower-level auto' to obtain the parameter automatically, specify it manually if 'auto' failed",
      ),
    );
    o.placeholder = _("auto");
    o.modalonly = true;

    o = s.taboption(
      "advanced",
      form.Flag,
      "fix_gro",
      _("Fix GRO"),
      _(
        "try to fix huge packet caused by GRO. This option is at an early stage. Make sure client and server are at same version.",
      ),
    );
    o.modalonly = true;

    o = s.taboption(
      "advanced",
      form.Flag,
      "retry_on_error",
      _("Retry on error"),
      _("retry on error, allow to start udp2raw before network is initialized"),
    );
    o.modalonly = true;

    o = s.taboption(
      "advanced",
      form.Flag,
      "disable_anti_replay",
      _("Disable anti-replay"),
      _("disable anti-replay, not suggested"),
    );
    o.modalonly = true;

    o = s.taboption(
      "advanced",
      form.Value,
      "log_level",
      _("Log Level"),
      _("0:never 1:fatal 2:error 3:warn 4:info (default) 5:debug 6:trace"),
    );
    o.datatype = "range(0,6)";
    o.placeholder = "4";
    o.modalonly = true;

    o = s.taboption(
      "advanced",
      form.Flag,
      "log_position",
      _("Log Position"),
      _("enable file name, function name, line number in log"),
    );
    o.modalonly = true;

    o = s.taboption(
      "advanced",
      form.Flag,
      "disable_color",
      _("Disable Log Color"),
      _("disable log color"),
    );
    o.modalonly = true;

    o = s.taboption(
      "advanced",
      form.Flag,
      "disable_bpf",
      _("Disable BPF"),
      _(
        "disable the kernel space filter, most time its not necessary unless you suspect there is a bug",
      ),
    );
    o.modalonly = true;

    o = s.taboption(
      "advanced",
      form.Flag,
      "auto_firewall",
      _("Auto Firewall Rule"),
      _(
        "Automatically add an iptables rule on start (and remove on stop). The rule is generated by running udp2raw with -g, so it always matches the current flags and binary version. Requires the iptables-nft package on OpenWrt 22.03+.",
      ),
    );
    o.modalonly = true;

    o = s.taboption(
      "advanced",
      form.Flag,
      "run_as_root",
      _("Run as root"),
      _(
        "Keep the process running as root instead of dropping to nobody:nogroup. " +
          "Required if you want to use udp2raw's native <code>--auto-rule</code> via " +
          "Extra Args, or on systems without file-capability support. " +
          "Do not enable together with the Auto Firewall Rule option above " +
          "(they would add the same iptables rule twice).",
      ),
    );
    o.modalonly = true;

    o = s.taboption(
      "advanced",
      form.Value,
      "extra_args",
      _("Extra Args"),
      _(
        "appended verbatim to the generated command line; use for any flag not exposed above (e.g. --wait-lock --hb-len 1024)",
      ),
    );
    o.placeholder = _("--hb-len 1024 --mtu-warn 1375");
    o.optional = true;
    o.modalonly = true;

    // Render the Service Control block (from udp2raw/status.js) above the
    // Tunnels form. Same pattern as luci-app-https-dns-proxy/overview.js.
    return Promise.all([status.render(), m.render()]);
  },
});
