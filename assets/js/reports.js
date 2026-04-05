const data = {
  revenue: 95200,
  expenses: 50000,
  cashCollected: 80100,
  cashVerified: 70000,
  cashUnverified: 10100,

  deliveryTypes: [70, 20, 10], // exchange, no exchange, return
  expensesBreakdown: [60, 25, 15], // gas, maintenance, others
};

// COMPUTE
const profit = data.revenue - data.expenses;
const margin = (profit / data.revenue) * 100;

// DISPLAY
document.getElementById("revenueValue").innerText = "₱" + data.revenue.toLocaleString();
document.getElementById("expenseValue").innerText = "₱" + data.expenses.toLocaleString();
document.getElementById("profitValue").innerText = "₱" + profit.toLocaleString();
document.getElementById("marginValue").innerText = margin.toFixed(1) + "%";

document.getElementById("cashCollected").innerText = "₱" + data.cashCollected;
document.getElementById("cashVerified").innerText = "₱" + data.cashVerified;
document.getElementById("cashUnverified").innerText = "₱" + data.cashUnverified;

// CHARTS
new Chart(document.getElementById("deliveryChart"), {
  type: "pie",
  data: {
    labels: ["With Exchange", "Without Exchange", "Return"],
    datasets: [{ data: data.deliveryTypes }]
  }
});

new Chart(document.getElementById("expenseChart"), {
  type: "pie",
  data: {
    labels: ["Gas", "Maintenance", "Others"],
    datasets: [{ data: data.expensesBreakdown }]
  }
});

// REVENUE TREND (LINE)
new Chart(document.getElementById("revenueChart"), {
  type: "line",
  data: {
    labels: ["Mar 1", "Mar 5", "Mar 10", "Mar 15", "Mar 20", "Mar 25", "Mar 30"],
    datasets: [
      {
        label: "Revenue",
        data: [12000, 15000, 18000, 16000, 21000, 25000, 28000],
        borderColor: "#10b981",
        tension: 0.4
      },
      {
        label: "Cash Collected",
        data: [10000, 13000, 17000, 15000, 20000, 23000, 26000],
        borderColor: "#3b82f6",
        tension: 0.4
      }
    ]
  }
});

// CASH PER DRIVER (BAR)
new Chart(document.getElementById("driverChart"), {
  type: "bar",
  data: {
    labels: ["John Driver", "Mike Rider", "Sam Express"],
    datasets: [
      {
        label: "Cash Collected",
        data: [32000, 28000, 19000],
        backgroundColor: "#10b981"
      }
    ]
  }
});

// SALES LOGBOOK TEMP DATA
const logbookData = [
  {
    date: "2026-03-28",
    customer: "Maria Santos",
    containers: "2",
    type: "With Exchange",
    amount: 500,
    driver: "John Driver"
  },
  {
    date: "2026-03-28",
    customer: "Juan Dela Cruz",
    containers: "4",
    type: "Without Exchange",
    amount: 1000,
    driver: "Mike Rider"
  },
  {
    date: "2026-03-28",
    customer: "Anna Reyes",
    containers: "3",
    type: "With Exchange",
    amount: 750,
    driver: "Sam Express"
  }
];

// RENDER TABLE
const table = document.getElementById("logbookTable");

logbookData.forEach(item => {
  table.innerHTML += `
    <tr>
      <td>${item.date}</td>
      <td>${item.customer}</td>
      <td>${item.containers} x 5-Gallon</td>
      <td>${item.type}</td>
      <td>₱${item.amount}</td>
      <td>${item.driver}</td>
    </tr>
  `;
});