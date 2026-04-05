let employees = [
  {
    id: "EMP-001",
    name: "John Driver",
    role: "Driver",
    contact: "09123456789",
    status: "Active",
    code: "A1B2C3",
    codeStatus: "Activated"
  }
];

// GENERATE CODE
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// RENDER
function renderEmployees() {
  const table = document.getElementById("employeeTable");
  table.innerHTML = "";

  employees.forEach(emp => {
    table.innerHTML += `
      <tr>
        <td>${emp.id}</td>
        <td>${emp.name}</td>
        <td><span class="badge bg-dark">${emp.role}</span></td>
        <td>${emp.contact}</td>
        <td><span class="badge bg-success">${emp.status}</span></td>
        <td class="code">${emp.code}</td>
        <td><span class="badge bg-success">${emp.codeStatus}</span></td>
        <td>View</td>
      </tr>
    `;
  });

  // STATS
  document.getElementById("totalEmp").innerText = employees.length;
}

// ADD
function addEmployee() {
  const newEmp = {
    id: "EMP-" + String(employees.length + 1).padStart(3, "0"),
    name: document.getElementById("empName").value,
    role: document.getElementById("empRole").value,
    contact: document.getElementById("empContact").value,
    status: "Active",
    code: generateCode(),
    codeStatus: "Unused"
  };

  employees.push(newEmp);
  renderEmployees();

  bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
}

renderEmployees();