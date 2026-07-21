"use strict";
"require ui";
"require rpc";
"require baseclass";

// Status module for luci-app-udp2raw.
//
// Mirrors luci-app-https-dns-proxy/https-dns-proxy/status.js: talks to the
// rpcd backend in /usr/libexec/rpcd/luci.udp2raw and renders the Service
// Status + Service Control block. Used by the main view via:
//
//   "require udp2raw.status as ud";
//   ...
//   return Promise.all([status.render(), m.render()]);
//
// Buttons are enabled/disabled based on the current service state:
//
//   enabled + running  -> Start disabled, Restart/Stop enabled,
//                        Enable disabled, Disable enabled
//   enabled + stopped  -> Start enabled, Restart/Stop disabled,
//                        Enable disabled, Disable enabled
//   disabled           -> Start/Restart/Stop disabled,
//                        Enable enabled, Disable disabled

var pkg = {
  get Name() {
    return "udp2raw";
  },
};

var getInitStatus = rpc.declare({
  object: "luci." + pkg.Name,
  method: "getInitStatus",
  params: ["name"],
});

var _setInitAction = rpc.declare({
  object: "luci." + pkg.Name,
  method: "setInitAction",
  params: ["name", "action"],
  expect: { result: false },
});

var RPC = {
  listeners: [],
  on: function (event, callback) {
    var pair = { event: event, callback: callback };
    this.listeners.push(pair);
    return function unsubscribe() {
      this.listeners = this.listeners.filter(function (listener) {
        return listener !== pair;
      });
    }.bind(this);
  },
  emit: function (event, data) {
    this.listeners.forEach(function (listener) {
      if (listener.event === event) {
        listener.callback(data);
      }
    });
  },
  getInitStatus: function (name) {
    getInitStatus(name).then(
      function (result) {
        this.emit("getInitStatus", result);
      }.bind(this),
    );
  },
  setInitAction: function (name, action) {
    _setInitAction(name, action).then(
      function (result) {
        this.emit("setInitAction", result);
      }.bind(this),
    );
  },
};

var status = baseclass.extend({
  render: function () {
    return L.resolveDefault(getInitStatus(pkg.Name), {}).then(function (data) {
      var reply = {
        enabled: (data && data[pkg.Name] && data[pkg.Name].enabled) || null,
        running: (data && data[pkg.Name] && data[pkg.Name].running) || null,
      };

      var header = E("h2", {}, _("udp2raw - Status"));

      // ----- Status text -----
      var statusTitle = E(
        "label",
        { class: "cbi-value-title", for: pkg.Name + "-status" },
        _("Service Status"),
      );
      var text;
      if (reply.running) {
        text = _("Running.");
      } else if (reply.enabled) {
        text = _("Stopped.");
      } else if (reply.enabled === false) {
        text = _("Stopped (Disabled).");
      } else {
        text = _("Not installed or not found.");
      }
      var statusText = E("output", { id: pkg.Name + "-status" }, text);
      var statusField = E("div", { class: "cbi-value-field" }, statusText);
      var statusDiv = E("div", { class: "cbi-value" }, [
        statusTitle,
        statusField,
      ]);

      // ----- Service control buttons -----
      var btn_gap = E("span", {}, "\u00a0\u00a0");
      var btn_gap_long = E("span", {}, "\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0");

      var btn_start = E(
        "button",
        {
          class: "btn cbi-button cbi-button-apply",
          disabled: true,
          click: function (ev) {
            ui.showModal(null, [
              E(
                "p",
                { class: "spinning" },
                _("Starting %s service").format(pkg.Name),
              ),
            ]);
            return RPC.setInitAction(pkg.Name, "start");
          },
        },
        _("Start"),
      );

      var btn_action = E(
        "button",
        {
          class: "btn cbi-button cbi-button-apply",
          disabled: true,
          click: function (ev) {
            ui.showModal(null, [
              E(
                "p",
                { class: "spinning" },
                _("Restarting %s service").format(pkg.Name),
              ),
            ]);
            return RPC.setInitAction(pkg.Name, "restart");
          },
        },
        _("Restart"),
      );

      var btn_stop = E(
        "button",
        {
          class: "btn cbi-button cbi-button-reset",
          disabled: true,
          click: function (ev) {
            ui.showModal(null, [
              E(
                "p",
                { class: "spinning" },
                _("Stopping %s service").format(pkg.Name),
              ),
            ]);
            return RPC.setInitAction(pkg.Name, "stop");
          },
        },
        _("Stop"),
      );

      var btn_enable = E(
        "button",
        {
          class: "btn cbi-button cbi-button-apply",
          disabled: true,
          click: function (ev) {
            ui.showModal(null, [
              E(
                "p",
                { class: "spinning" },
                _("Enabling %s service").format(pkg.Name),
              ),
            ]);
            return RPC.setInitAction(pkg.Name, "enable");
          },
        },
        _("Enable"),
      );

      var btn_disable = E(
        "button",
        {
          class: "btn cbi-button cbi-button-reset",
          disabled: true,
          click: function (ev) {
            ui.showModal(null, [
              E(
                "p",
                { class: "spinning" },
                _("Disabling %s service").format(pkg.Name),
              ),
            ]);
            return RPC.setInitAction(pkg.Name, "disable");
          },
        },
        _("Disable"),
      );

      if (reply.enabled) {
        btn_enable.disabled = true;
        btn_disable.disabled = false;
        if (reply.running) {
          btn_start.disabled = true;
          btn_action.disabled = false;
          btn_stop.disabled = false;
        } else {
          btn_start.disabled = false;
          btn_action.disabled = true;
          btn_stop.disabled = true;
        }
      } else {
        btn_start.disabled = true;
        btn_action.disabled = true;
        btn_stop.disabled = true;
        btn_enable.disabled = false;
        btn_disable.disabled = true;
      }

      var buttonsTitle = E(
        "label",
        { class: "cbi-value-title", for: pkg.Name + "-buttons" },
        _("Service Control"),
      );
      var buttonsText = E("output", { id: pkg.Name + "-buttons" }, [
        btn_start,
        btn_gap,
        btn_action,
        btn_gap,
        btn_stop,
        btn_gap_long,
        btn_enable,
        btn_gap,
        btn_disable,
      ]);
      var buttonsField = E("div", { class: "cbi-value-field" }, buttonsText);
      var buttonsDiv = E("div", { class: "cbi-value" }, [
        buttonsTitle,
        buttonsField,
      ]);

      return E("div", {}, [header, statusDiv, buttonsDiv]);
    });
  },
});

// After any service action, close the modal and reload the page so the
// button states reflect the new reality.
RPC.on("setInitAction", function (reply) {
  ui.hideModal();
  location.reload();
});

return L.Class.extend({
  status: status,
  pkg: pkg,
  getInitStatus: getInitStatus,
});
