function showTab(id, trigger) {
  document.querySelectorAll(".tab-content").forEach(tab => {
    tab.classList.remove("active");
  });

  document.getElementById(id).classList.add("active");

  document.querySelectorAll(".menu-item").forEach(item => {
    item.classList.remove("active");
  });

  if (trigger) {
    trigger.classList.add("active");
  }
}

function getById(id) {
  return document.getElementById(id);
}

const SETTINGS_ID = (window.SYSTEM_SETTINGS_ID || "57dd6c1c-7a08-46a2-9f36-29214ad403c2").trim();
let settingsColumnSet = new Set();

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

function setInputValue(id, value) {
  const el = getById(id);
  if (!el) return;
  el.value = value ?? "";
}

function setCheckboxValue(id, value) {
  const el = getById(id);
  if (!el) return;
  el.checked = Boolean(value);
}

function toNumberOrZero(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getExchangeValueFromRow(row) {
  return row?.price_with_exchange ?? row?.with_exchange_price ?? 0;
}

function getExchangeColumnCandidates() {
  const candidates = [];

  if (settingsColumnSet.has("price_with_exchange")) {
    candidates.push("price_with_exchange");
  }

  if (settingsColumnSet.has("with_exchange_price")) {
    candidates.push("with_exchange_price");
  }

  if (!candidates.length) {
    // Try common variants in order when schema metadata is unavailable.
    candidates.push("price_with_exchange", "with_exchange_price");
  }

  return [...new Set(candidates)];
}

function syncCodeLengthState() {
  const autoCode = getById("autoCode");
  const codeLength = getById("codeLength");

  if (!autoCode || !codeLength) return;

  codeLength.disabled = !autoCode.checked;
}

async function loadSettings() {
  try {
    console.log("[Settings] Loading settings...");

    if (!isValidUuid(SETTINGS_ID)) {
      console.error("[Settings] Invalid SETTINGS_ID UUID. Set a valid UUID in SETTINGS_ID.", SETTINGS_ID);
      return;
    }

    const { data, error } = await supabaseClient
      .from("system_settings")
      .select("*")
      .eq("id", SETTINGS_ID)
      .single();

    console.log("[Settings] load result:", data);
    console.log("[Settings] load error:", error);

    if (error) {
      console.error("[Settings] load error:", error);
      return;
    }

    const row = data || {};
    settingsColumnSet = new Set(Object.keys(row));

    console.log("[Pricing] loaded:", {
      id: row.id,
      base_price: row.base_price,
      price_with_exchange: row.price_with_exchange,
      with_exchange_price: row.with_exchange_price,
    });

    setInputValue("basePrice", row.base_price ?? 0);
    setInputValue("withExchange", getExchangeValueFromRow(row));

    if (settingsColumnSet.has("auto_generate_employee_code")) {
      setCheckboxValue("autoCode", row.auto_generate_employee_code ?? true);
    } else {
      setCheckboxValue("autoCode", true);
    }

    if (settingsColumnSet.has("employee_code_length")) {
      setInputValue("codeLength", row.employee_code_length ?? 6);
    } else {
      setInputValue("codeLength", 6);
    }

    syncCodeLengthState();
  } catch (err) {
    console.error("[Settings] Unexpected load error:", err);
  }
}

async function saveSettings() {
  try {
    if (!isValidUuid(SETTINGS_ID)) {
      console.error("[Settings] Invalid SETTINGS_ID UUID. Set a valid UUID in SETTINGS_ID.", SETTINGS_ID);
      alert("Invalid Settings ID. Please configure a valid UUID.");
      return;
    }

    const codeLengthRaw = Number(getById("codeLength")?.value);
    const codeLength = Number.isFinite(codeLengthRaw) && codeLengthRaw > 0
      ? Math.trunc(codeLengthRaw)
      : 6;

    const basePrice = toNumberOrZero(getById("basePrice")?.value);
    const withExchange = toNumberOrZero(getById("withExchange")?.value);

    const pricingPayloadDebug = {
      id: SETTINGS_ID,
      base_price: basePrice,
      exchange_value: withExchange,
      exchange_candidates: getExchangeColumnCandidates(),
    };
    console.log("[Pricing] payload:", pricingPayloadDebug);

    const basePayload = {
      id: SETTINGS_ID,
      base_price: basePrice,
    };

    if (settingsColumnSet.has("updated_at")) {
      basePayload.updated_at = new Date().toISOString();
    }

    if (settingsColumnSet.has("auto_generate_employee_code")) {
      basePayload.auto_generate_employee_code = Boolean(getById("autoCode")?.checked);
    }

    if (settingsColumnSet.has("employee_code_length")) {
      basePayload.employee_code_length = codeLength;
    }

    let saveResult = null;
    let lastError = null;
    const exchangeColumns = getExchangeColumnCandidates();

    for (const exchangeColumn of exchangeColumns) {
      const payload = {
        ...basePayload,
        [exchangeColumn]: withExchange,
      };

      console.log("[Settings] save payload:", payload);

      const { data, error } = await supabaseClient
        .from("system_settings")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();

      console.log("[Settings] save result:", data);
      console.log("[Settings] save error:", error);

      if (!error) {
        saveResult = data;
        break;
      }

      lastError = error;

      // If the column does not exist, try next known naming variant.
      if (error.code === "PGRST204") {
        console.warn(`[Pricing] Column ${exchangeColumn} not found, trying next variant.`);
        continue;
      }

      break;
    }

    if (!saveResult) {
      console.error("[Pricing] save error:", lastError);
      console.error("[Settings] Failed to save settings:", lastError);
      alert("Failed to save settings.");
      return;
    }

    console.log("[Pricing] saved:", saveResult);

    alert("Settings saved!");
  } catch (err) {
    console.error("[Settings] Unexpected save error:", err);
    alert("Unexpected error while saving settings.");
  }
}

// LOGOUT
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("user");
    window.location.href = "../index.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const autoCodeInput = getById("autoCode");
  if (autoCodeInput) {
    autoCodeInput.addEventListener("change", syncCodeLengthState);
  }

  syncCodeLengthState();
  loadSettings();
});

window.saveSettings = saveSettings;