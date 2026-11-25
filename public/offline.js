(function () {
  var MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  var SCHEMA = 1;
  var KEY_PREFIX = "sora:offline:snapshot:";
  var ACTIVE_KEY = "sora:offline:active";

  function discard() {
    try {
      var walletId = window.localStorage.getItem(ACTIVE_KEY);
      if (walletId) {
        window.localStorage.removeItem(KEY_PREFIX + walletId);
      }
      window.localStorage.removeItem(ACTIVE_KEY);
    } catch {
      return;
    }
  }

  function loadSnapshot() {
    try {
      var walletId = window.localStorage.getItem(ACTIVE_KEY);
      if (!walletId) return null;

      var raw = window.localStorage.getItem(KEY_PREFIX + walletId);
      if (!raw) return null;

      var value = JSON.parse(raw);
      if (
        !value ||
        value.schema !== SCHEMA ||
        value.walletId !== walletId ||
        typeof value.savedAt !== "number" ||
        typeof value.currency !== "string" ||
        !value.stats ||
        typeof value.stats.income !== "number" ||
        typeof value.stats.expense !== "number" ||
        typeof value.stats.net !== "number" ||
        !Array.isArray(value.balances)
      ) {
        discard();
        return null;
      }

      return value;
    } catch {
      discard();
      return null;
    }
  }

  function formatMoney(currency, amount) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return (
        new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
          amount,
        ) +
        " " +
        currency
      );
    }
  }

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function renderBalance(entry, currency, list) {
    var item = document.createElement("li");
    var name = document.createElement("span");
    name.textContent = entry.name;
    var amount = document.createElement("strong");

    if (entry.balance === 0) {
      amount.textContent = "All settled up";
    } else if (entry.balance > 0) {
      amount.textContent = "You owe " + formatMoney(currency, entry.balance);
    } else {
      amount.textContent =
        entry.name + " owes you " + formatMoney(currency, -entry.balance);
    }

    item.appendChild(name);
    item.appendChild(amount);
    list.appendChild(item);
  }

  function consumeClearMarker() {
    try {
      var parts = document.cookie.split("; ");
      for (var index = 0; index < parts.length; index += 1) {
        if (parts[index] === "sora_clear_offline=1") {
          discard();
          document.cookie = "sora_clear_offline=; path=/; max-age=0";
          return;
        }
      }
    } catch {
      return;
    }
  }

  consumeClearMarker();

  var snapshot = loadSnapshot();
  var message = document.getElementById("message");
  var snapshotSection = document.getElementById("snapshot");
  var empty = document.getElementById("empty");

  if (snapshot && Date.now() - snapshot.savedAt <= MAX_AGE_MS) {
    if (message) {
      message.textContent =
        "You are offline. Here are your last saved balances.";
    }
    if (snapshotSection) snapshotSection.hidden = false;

    setText("income", formatMoney(snapshot.currency, snapshot.stats.income));
    setText("expense", formatMoney(snapshot.currency, snapshot.stats.expense));
    setText("net", formatMoney(snapshot.currency, snapshot.stats.net));

    var list = document.getElementById("balances");
    if (list) {
      for (var index = 0; index < snapshot.balances.length; index += 1) {
        renderBalance(snapshot.balances[index], snapshot.currency, list);
      }
    }
  } else if (snapshot) {
    if (message) {
      message.textContent =
        "Your saved balances have expired. Reconnect to see current figures.";
    }
    if (empty) empty.hidden = false;
  } else {
    if (message) {
      message.textContent =
        "You are offline and have no saved balances yet. Connect once to save a summary for offline use.";
    }
    if (empty) empty.hidden = false;
  }

  var retry = document.getElementById("retry");
  if (retry) {
    retry.addEventListener("click", function () {
      window.location.reload();
    });
  }
})();
