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

function syncCodeLengthState() {
  const autoCode = document.getElementById("autoCode");
  const codeLength = document.getElementById("codeLength");

  if (!autoCode || !codeLength) return;

  codeLength.disabled = !autoCode.checked;
}

// SAVE
function saveSettings() {
  const data = {
    stationName: document.getElementById("stationName").value,
    priceBase: document.getElementById("priceBase").value,
    priceExchange: document.getElementById("priceExchange").value,
    stationContact: document.getElementById("stationContact").value,
    codEnabled: document.getElementById("codEnabled").checked
  };

  console.log("Saved:", data);
  alert("Settings saved!");
}

// LOGOUT
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("user");
    window.location.href = "../index.html";
  }
}

const autoCodeInput = document.getElementById("autoCode");
if (autoCodeInput) {
  autoCodeInput.addEventListener("change", syncCodeLengthState);
}

syncCodeLengthState();