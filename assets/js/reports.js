const salesRecords = [
  { created_at: "2026-03-20", customer: "Maria Santos", containers: 2, type: "With Exchange", amount: 500, driver: "John Driver", cash_status: "verified" },
  { created_at: "2026-03-22", customer: "Juan Dela Cruz", containers: 4, type: "Without Exchange", amount: 1000, driver: "Mike Rider", cash_status: "verified" },
  { created_at: "2026-03-24", customer: "Anna Reyes", containers: 3, type: "With Exchange", amount: 750, driver: "Sam Express", cash_status: "unverified" },
  { created_at: "2026-03-26", customer: "Ralph Gomez", containers: 2, type: "Return", amount: 300, driver: "John Driver", cash_status: "verified" },
  { created_at: "2026-03-28", customer: "Nina Cruz", containers: 5, type: "Without Exchange", amount: 1250, driver: "Mike Rider", cash_status: "verified" },
  { created_at: "2026-03-30", customer: "Rico Lim", containers: 1, type: "With Exchange", amount: 250, driver: "Sam Express", cash_status: "unverified" },
  { created_at: "2026-04-01", customer: "Lia Ramos", containers: 6, type: "With Exchange", amount: 1500, driver: "John Driver", cash_status: "verified" },
  { created_at: "2026-04-03", customer: "Trish Uy", containers: 2, type: "Without Exchange", amount: 500, driver: "Mike Rider", cash_status: "verified" },
  { created_at: "2026-04-05", customer: "Ken Bautista", containers: 4, type: "With Exchange", amount: 1000, driver: "Sam Express", cash_status: "unverified" },
  { created_at: "2026-04-08", customer: "Joan Diaz", containers: 3, type: "Return", amount: 450, driver: "John Driver", cash_status: "verified" },
  { created_at: "2026-04-10", customer: "Mila Navarro", containers: 5, type: "With Exchange", amount: 1250, driver: "Mike Rider", cash_status: "verified" },
  { created_at: "2026-04-12", customer: "Alvin Reyes", containers: 2, type: "Without Exchange", amount: 500, driver: "Sam Express", cash_status: "unverified" },
  { created_at: "2026-04-14", customer: "Dina Salonga", containers: 3, type: "With Exchange", amount: 750, driver: "John Driver", cash_status: "verified" }
];

const expenseRecords = [
  { created_at: "2026-03-20", category: "Gas", amount: 900 },
  { created_at: "2026-03-21", category: "Maintenance", amount: 1500 },
  { created_at: "2026-03-24", category: "Others", amount: 600 },
  { created_at: "2026-03-27", category: "Gas", amount: 1200 },
  { created_at: "2026-03-30", category: "Maintenance", amount: 1100 },
  { created_at: "2026-04-02", category: "Others", amount: 850 },
  { created_at: "2026-04-05", category: "Gas", amount: 1300 },
  { created_at: "2026-04-08", category: "Maintenance", amount: 1700 },
  { created_at: "2026-04-11", category: "Gas", amount: 950 },
  { created_at: "2026-04-13", category: "Others", amount: 700 }
];

const rangeFilter = document.getElementById("rangeFilter");
const customRangeBtn = document.getElementById("customRangeBtn");
const customRangePanel = document.getElementById("customRangePanel");
const startDateInput = document.getElementById("startDateInput");
const endDateInput = document.getElementById("endDateInput");
const applyCustomRangeBtn = document.getElementById("applyCustomRangeBtn");
const cancelCustomRangeBtn = document.getElementById("cancelCustomRangeBtn");
const activeDateRangeEl = document.getElementById("activeDateRange");

const table = document.getElementById("logbookTable");

let activeFilter = {
  mode: "preset",
  days: Number(rangeFilter.value),
  startDate: null,
  endDate: null
};

let revenueChartInstance;
let deliveryChartInstance;
let expenseChartInstance;
let driverChartInstance;

function parseDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`);
}

function formatCurrency(value) {
  return `₱${value.toLocaleString()}`;
}

function formatDisplayDate(dateStr) {
  const date = parseDate(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatDayLabel(dateStr) {
  const date = parseDate(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getLatestDate(records) {
  if (!records.length) return null;
  return records.reduce((latest, item) => {
    return parseDate(item.created_at) > parseDate(latest.created_at) ? item : latest;
  }).created_at;
}

function getDateRangeFromPreset(days) {
  const latestDate = getLatestDate(salesRecords) || new Date().toISOString().slice(0, 10);
  const endDate = parseDate(latestDate);
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (days - 1));

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10)
  };
}

function filterDataByDate(data, startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  return data.filter(item => {
    if (!item.created_at) return false;
    const current = parseDate(item.created_at);
    return current >= start && current <= end;
  });
}

function sumAmounts(records) {
  return records.reduce((total, item) => total + (item.amount || 0), 0);
}

function groupBy(records, keyFn, amountFn = item => item.amount || 0) {
  return records.reduce((grouped, item) => {
    const key = keyFn(item);
    grouped[key] = (grouped[key] || 0) + amountFn(item);
    return grouped;
  }, {});
}

function getFullDateRangeArray(startDate, endDate) {
  const dates = [];
  const cursor = parseDate(startDate);
  const end = parseDate(endDate);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function buildPreviousPeriodRange(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const msPerDay = 24 * 60 * 60 * 1000;
  const spanDays = Math.floor((end - start) / msPerDay) + 1;

  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (spanDays - 1));

  return {
    startDate: previousStart.toISOString().slice(0, 10),
    endDate: previousEnd.toISOString().slice(0, 10)
  };
}

function updateTopStats(filteredSales, filteredExpenses, startDate, endDate) {
  const revenue = sumAmounts(filteredSales);
  const expenses = sumAmounts(filteredExpenses);
  const profit = revenue - expenses;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  document.getElementById("revenueValue").innerText = formatCurrency(revenue);
  document.getElementById("expenseValue").innerText = formatCurrency(expenses);
  document.getElementById("profitValue").innerText = formatCurrency(profit);
  document.getElementById("marginValue").innerText = `${margin.toFixed(1)}%`;

  const previousPeriod = buildPreviousPeriodRange(startDate, endDate);
  const previousSales = filterDataByDate(salesRecords, previousPeriod.startDate, previousPeriod.endDate);
  const previousRevenue = sumAmounts(previousSales);
  const trendEl = document.getElementById("revenueTrend");

  if (previousRevenue === 0) {
    trendEl.className = "trend";
    trendEl.textContent = "No prior period data";
    return;
  }

  const delta = ((revenue - previousRevenue) / previousRevenue) * 100;
  const trendClass = delta >= 0 ? "up" : "down";
  const trendIcon = delta >= 0 ? "▲" : "▼";

  trendEl.className = `trend ${trendClass}`;
  trendEl.textContent = `${trendIcon} ${Math.abs(delta).toFixed(1)}% vs previous period`;
}

function updateCashCards(filteredSales) {
  const cashCollected = sumAmounts(filteredSales);
  const cashVerified = sumAmounts(filteredSales.filter(item => item.cash_status === "verified"));
  const cashUnverified = cashCollected - cashVerified;

  document.getElementById("cashCollected").innerText = formatCurrency(cashCollected);
  document.getElementById("cashVerified").innerText = formatCurrency(cashVerified);
  document.getElementById("cashUnverified").innerText = formatCurrency(cashUnverified);
}

function renderRevenueTrendChart(filteredSales, startDate, endDate) {
  const dateRange = getFullDateRangeArray(startDate, endDate);
  const byDayRevenue = groupBy(filteredSales, item => item.created_at, item => item.amount || 0);
  const byDayVerified = groupBy(
    filteredSales.filter(item => item.cash_status === "verified"),
    item => item.created_at,
    item => item.amount || 0
  );

  const labels = dateRange.map(date => formatDayLabel(date));
  const revenueData = dateRange.map(date => byDayRevenue[date] || 0);
  const verifiedData = dateRange.map(date => byDayVerified[date] || 0);

  if (revenueChartInstance) revenueChartInstance.destroy();
  revenueChartInstance = new Chart(document.getElementById("revenueChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Revenue",
          data: revenueData,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.12)",
          fill: true,
          tension: 0.35
        },
        {
          label: "Verified Cash",
          data: verifiedData,
          borderColor: "#3b82f6",
          tension: 0.35
        }
      ]
    },
    options: {
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderDeliveryChart(filteredSales) {
  const typeCounts = {
    "With Exchange": 0,
    "Without Exchange": 0,
    Return: 0
  };

  filteredSales.forEach(item => {
    if (Object.prototype.hasOwnProperty.call(typeCounts, item.type)) {
      typeCounts[item.type] += 1;
    }
  });

  if (deliveryChartInstance) deliveryChartInstance.destroy();
  deliveryChartInstance = new Chart(document.getElementById("deliveryChart"), {
    type: "pie",
    data: {
      labels: Object.keys(typeCounts),
      datasets: [{ data: Object.values(typeCounts), backgroundColor: ["#10b981", "#f59e0b", "#3b82f6"] }]
    }
  });
}

function renderExpenseChart(filteredExpenses) {
  const categories = {
    Gas: 0,
    Maintenance: 0,
    Others: 0
  };

  filteredExpenses.forEach(item => {
    if (Object.prototype.hasOwnProperty.call(categories, item.category)) {
      categories[item.category] += item.amount;
    }
  });

  if (expenseChartInstance) expenseChartInstance.destroy();
  expenseChartInstance = new Chart(document.getElementById("expenseChart"), {
    type: "pie",
    data: {
      labels: Object.keys(categories),
      datasets: [{ data: Object.values(categories), backgroundColor: ["#16a34a", "#0ea5e9", "#f97316"] }]
    }
  });
}

function renderDriverChart(filteredSales) {
  const driverTotals = groupBy(filteredSales, item => item.driver, item => item.amount || 0);

  if (driverChartInstance) driverChartInstance.destroy();
  driverChartInstance = new Chart(document.getElementById("driverChart"), {
    type: "bar",
    data: {
      labels: Object.keys(driverTotals),
      datasets: [
        {
          label: "Cash Collected",
          data: Object.values(driverTotals),
          backgroundColor: "#10b981"
        }
      ]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderLogbook(filteredSales) {
  if (!filteredSales.length) {
    table.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">No records found for the selected range.</td>
      </tr>
    `;
    return;
  }

  const sortedRows = [...filteredSales].sort((a, b) => parseDate(b.created_at) - parseDate(a.created_at));
  table.innerHTML = sortedRows.map(item => `
    <tr>
      <td>${item.created_at}</td>
      <td>${item.customer}</td>
      <td>${item.containers} x 5-Gallon</td>
      <td>${item.type}</td>
      <td>${formatCurrency(item.amount)}</td>
      <td>${item.driver}</td>
    </tr>
  `).join("");
}

function updateActiveRangeText(startDate, endDate) {
  activeDateRangeEl.textContent = `Showing: ${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
}

function updateReports(startDate, endDate) {
  const filteredSales = filterDataByDate(salesRecords, startDate, endDate);
  const filteredExpenses = filterDataByDate(expenseRecords, startDate, endDate);

  updateTopStats(filteredSales, filteredExpenses, startDate, endDate);
  updateCashCards(filteredSales);
  renderRevenueTrendChart(filteredSales, startDate, endDate);
  renderDeliveryChart(filteredSales);
  renderExpenseChart(filteredExpenses);
  renderDriverChart(filteredSales);
  renderLogbook(filteredSales);
  updateActiveRangeText(startDate, endDate);
}

function applyPresetFilter(days) {
  const { startDate, endDate } = getDateRangeFromPreset(days);

  activeFilter = {
    mode: "preset",
    days,
    startDate,
    endDate
  };

  updateReports(startDate, endDate);
}

function applyCustomRange() {
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  if (!startDate || !endDate) {
    alert("Please select both start and end dates.");
    return;
  }

  if (parseDate(startDate) > parseDate(endDate)) {
    alert("Start date cannot be later than end date.");
    return;
  }

  activeFilter = {
    mode: "custom",
    days: null,
    startDate,
    endDate
  };

  customRangePanel.classList.add("d-none");
  updateReports(startDate, endDate);
}

rangeFilter.addEventListener("change", event => {
  const days = Number(event.target.value);
  applyPresetFilter(days);
});

customRangeBtn.addEventListener("click", () => {
  if (activeFilter.startDate && activeFilter.endDate) {
    startDateInput.value = activeFilter.startDate;
    endDateInput.value = activeFilter.endDate;
  }

  customRangePanel.classList.toggle("d-none");
});

applyCustomRangeBtn.addEventListener("click", applyCustomRange);

cancelCustomRangeBtn.addEventListener("click", () => {
  customRangePanel.classList.add("d-none");
});

applyPresetFilter(Number(rangeFilter.value));