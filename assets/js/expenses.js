// TEMP DATA
let expenses = [
  {
    date: "2026-04-01",
    type: "Fuel",
    amount: 300,
    driver: "John Driver",
    notes: "Gas refill"
  },
  {
    date: "2026-04-02",
    type: "Tire Repair",
    amount: 500,
    driver: "Mike Rider",
    notes: "Motor tire fix"
  }
];

// DISPLAY
function renderExpenses() {
  const table = document.getElementById("expenseTable");
  table.innerHTML = "";

  expenses.forEach(exp => {
    table.innerHTML += `
      <tr>
        <td>${exp.date}</td>
        <td>${exp.type}</td>
        <td>₱${exp.amount}</td>
        <td>${exp.driver || "-"}</td>
        <td>${exp.notes}</td>
      </tr>
    `;
  });
}

// ADD
function addExpense() {
  const exp = {
    date: document.getElementById("expDate").value,
    type: document.getElementById("expType").value,
    amount: parseFloat(document.getElementById("expAmount").value),
    driver: document.getElementById("expDriver").value,
    notes: document.getElementById("expNotes").value
  };

  expenses.push(exp);
  renderExpenses();

  // CLOSE MODAL
  const modal = bootstrap.Modal.getInstance(document.getElementById('expenseModal'));
  modal.hide();
}

renderExpenses();