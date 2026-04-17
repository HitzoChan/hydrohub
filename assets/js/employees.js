let employeeFormMode = "add";

async function generateEmployeeId() {
  try {
    const { data, error } = await supabaseClient
      .from("employees")
      .select("employee_id");

    if (error) {
      console.error(error);
      return "EMP-001";
    }

    const maxSequence = (data || []).reduce((maxValue, row) => {
      const idValue = row?.employee_id || "";
      const match = /^EMP-(\d+)$/i.exec(idValue);
      if (!match) return maxValue;

      const current = Number(match[1]);
      return Number.isNaN(current) ? maxValue : Math.max(maxValue, current);
    }, 0);

    return `EMP-${String(maxSequence + 1).padStart(3, "0")}`;
  } catch (error) {
    console.error(error);
    return "EMP-001";
  }
}

function generateAccessCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 8; index++) {
    code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return code;
}

function formatEmployeeId(employeeId, id) {
  if (employeeId) return employeeId;
  if (!id) return "N/A";
  const idString = String(id);
  return "EMP-" + idString.slice(-4).toUpperCase();
}

function setFormError(message) {
  const alertBox = document.getElementById("employeeFormAlert");
  if (!alertBox) return;

  if (message) {
    alertBox.classList.remove("d-none");
    alertBox.textContent = message;
    return;
  }

  alertBox.classList.add("d-none");
  alertBox.textContent = "";
}

function toggleLicenseField() {
  const role = document.getElementById("empRole")?.value || "";
  const group = document.getElementById("driverLicenseGroup");
  const input = document.getElementById("empLicense");
  if (!group || !input) return;

  if (role === "Driver") {
    group.classList.remove("d-none");
    input.setAttribute("required", "required");
  } else {
    group.classList.add("d-none");
    input.removeAttribute("required");
    input.value = "";
  }
}

function normalizePhone(value) {
  return (value || "").trim();
}

function isValidPhone(phone) {
  return /^(\+63|0)\d{10}$/.test(phone);
}

function formatDateForDb(dateInput) {
  if (!dateInput) return null;
  return new Date(dateInput).toISOString().split("T")[0];
}

function buildAddress() {
  const street = document.getElementById("empStreet")?.value?.trim() || "";
  const barangay = document.getElementById("empBarangay")?.value?.trim() || "";
  const city = document.getElementById("empCity")?.value?.trim() || "";
  const province = document.getElementById("empProvince")?.value?.trim() || "";

  return [street, barangay, city, province].filter(Boolean).join(", ");
}

function getEmployeeFormData() {
  return {
    name: document.getElementById("empName")?.value?.trim() || "",
    birthdate: document.getElementById("empBirthdate")?.value || null,
    gender: document.getElementById("empGender")?.value || null,
    civil_status: document.getElementById("empCivilStatus")?.value || null,
    phone: normalizePhone(document.getElementById("empPhone")?.value),
    email: document.getElementById("empEmail")?.value?.trim() || null,
    emergency_contact_name: document.getElementById("empEmergencyName")?.value?.trim() || null,
    emergency_contact_number: normalizePhone(document.getElementById("empEmergencyPhone")?.value) || null,
    street: document.getElementById("empStreet")?.value?.trim() || null,
    barangay: document.getElementById("empBarangay")?.value?.trim() || null,
    city: document.getElementById("empCity")?.value?.trim() || null,
    province: document.getElementById("empProvince")?.value?.trim() || null,
    address: buildAddress(),
    role: document.getElementById("empRole")?.value || "",
    status: document.getElementById("empStatus")?.value || "Active",
    date_hired: document.getElementById("empDateHired")?.value || null,
    license_number: document.getElementById("empLicense")?.value?.trim() || null,
    access_code: document.getElementById("empAccessCode")?.value?.trim() || "",
    code_status: document.getElementById("empCodeStatus")?.value || "Activated"
  };
}

function validateEmployeeForm(formData) {
  if (!formData.name) {
    return "Full Name is required.";
  }

  if (!formData.role) {
    return "Role is required.";
  }

  if (!formData.phone) {
    return "Phone Number is required.";
  }

  if (!isValidPhone(formData.phone)) {
    return "Phone format is invalid. Use 09XXXXXXXXX or +63XXXXXXXXXX.";
  }

  if (formData.emergency_contact_number && !isValidPhone(formData.emergency_contact_number)) {
    return "Emergency contact number format is invalid.";
  }

  if (String(formData.role).toLowerCase() === "driver" && !formData.license_number) {
    return "Driver License Number is required for Driver role.";
  }

  return "";
}

function setEmployeeModalMode(mode) {
  employeeFormMode = mode;

  const modalElement = document.getElementById("employeeModal");
  const titleElement = modalElement?.querySelector(".modal-header h5");
  const submitButton = document.getElementById("empSubmitBtn");

  if (titleElement) {
    titleElement.textContent = mode === "edit" ? "Edit Employee" : "Add Employee";
  }

  if (submitButton) {
    if (mode === "edit") {
      submitButton.textContent = "Update";
      submitButton.setAttribute("onclick", "updateEmployee()");
    } else {
      submitButton.textContent = "Save";
      submitButton.setAttribute("onclick", "addEmployee()");
    }
  }
}

function setEmployeeViewField(fieldId, value) {
  const element = document.getElementById(fieldId);
  if (!element) return;
  element.textContent = value || "N/A";
}

function viewEmployee(employeeId) {
  const row = document.querySelector(`#employeesTableBody button[onclick*="${employeeId}"]`)?.closest("tr");

  setEmployeeViewField("viewEmployeeId", row?.children?.[0]?.innerText?.trim() || "N/A");
  setEmployeeViewField("viewEmployeeName", row?.children?.[1]?.querySelector(".fw-semibold")?.innerText?.trim() || "N/A");
  setEmployeeViewField("viewEmployeeEmail", row?.children?.[1]?.querySelector("small")?.innerText?.trim() || "N/A");

  loadEmployeeForView(employeeId);
}

async function loadEmployeeForView(employeeId) {
  try {
    const { data, error } = await supabaseClient
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .single();

    if (error || !data) {
      console.error("Failed to load employee for viewing:", error);
      alert("Failed to load employee details.");
      return;
    }

    setEmployeeViewField("viewEmployeeId", formatEmployeeId(data.employee_id, data.id));
    setEmployeeViewField("viewEmployeeName", data.name);
    setEmployeeViewField("viewEmployeeBirthdate", data.birthdate);
    setEmployeeViewField("viewEmployeeGender", data.gender);
    setEmployeeViewField("viewEmployeeCivilStatus", data.civil_status);
    setEmployeeViewField("viewEmployeePhone", data.phone);
    setEmployeeViewField("viewEmployeeEmail", data.email);
    setEmployeeViewField("viewEmployeeEmergencyName", data.emergency_contact_name);
    setEmployeeViewField("viewEmployeeEmergencyNumber", data.emergency_contact_number);
    setEmployeeViewField("viewEmployeeRole", data.role);
    setEmployeeViewField("viewEmployeeStatus", data.status);

    const viewModal = document.getElementById("employeeViewModal");
    const viewInstance = bootstrap.Modal.getOrCreateInstance(viewModal);
    viewInstance.show();
  } catch (error) {
    console.error("Unexpected viewEmployee error:", error);
    alert("Unexpected error while loading employee details.");
  }
}

async function editEmployee(employeeId) {
  try {
    const { data, error } = await supabaseClient
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .single();

    if (error || !data) {
      console.error("Failed to load employee for editing:", error);
      alert("Failed to load employee details.");
      return;
    }

    document.getElementById("empEditId").value = data.id || "";
    document.getElementById("empName").value = data.name || "";
    document.getElementById("empBirthdate").value = data.birthdate || "";
    document.getElementById("empGender").value = data.gender || "";
    document.getElementById("empCivilStatus").value = data.civil_status || "";
    document.getElementById("empPhone").value = data.phone || "";
    document.getElementById("empEmail").value = data.email || "";
    document.getElementById("empEmergencyName").value = data.emergency_contact_name || "";
    document.getElementById("empEmergencyPhone").value = data.emergency_contact_number || "";
    document.getElementById("empStreet").value = data.street || "";
    document.getElementById("empBarangay").value = data.barangay || "";
    document.getElementById("empCity").value = data.city || "";
    document.getElementById("empProvince").value = data.province || "";

    const roleValue = String(data.role || "");
    const statusValue = String(data.status || "").toLowerCase();

    document.getElementById("empRole").value = roleValue
      ? roleValue.charAt(0).toUpperCase() + roleValue.slice(1)
      : "";
    document.getElementById("empStatus").value = statusValue === "inactive" ? "Inactive" : "Active";

    document.getElementById("empDateHired").value = data.date_hired || "";
    document.getElementById("empLicense").value = data.license_number || "";
    document.getElementById("empAccessCode").value = data.access_code || generateAccessCode();
    document.getElementById("empCodeStatus").value = data.code_status || "Activated";

    setFormError("");
    toggleLicenseField();
    setEmployeeModalMode("edit");

    const modalElement = document.getElementById("employeeModal");
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();
  } catch (error) {
    console.error("Unexpected editEmployee error:", error);
    alert("Unexpected error while loading employee details.");
  }
}

function renderEmployees(employees) {
  const table = document.getElementById("employeesTableBody") || document.getElementById("employeeTable");
  if (!table) return;

  table.innerHTML = "";

  if (!employees.length) {
    table.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">No employees found.</td>
      </tr>
    `;
    updateStats([]);
    return;
  }

  employees.forEach((emp) => {
    const normalizedStatus = String(emp.status || "").toLowerCase();
    const normalizedCodeStatus = String(emp.code_status || "").toLowerCase();
    const statusClass = normalizedStatus === "active" || normalizedStatus === "available" ? "bg-success" : "bg-secondary";
    const codeClass = normalizedCodeStatus === "activated" ? "bg-success" : "bg-warning text-dark";

    table.innerHTML += `
      <tr>
        <td>${formatEmployeeId(emp.employee_id, emp.id)}</td>
        <td>
          <div class="fw-semibold">${emp.name || "N/A"}</div>
          <small class="text-muted">${emp.email || "No email"}</small>
        </td>
        <td><span class="badge bg-dark">${emp.role || "N/A"}</span></td>
        <td>
          <div>${emp.phone || "N/A"}</div>
          <small class="text-muted">${emp.address || [emp.street, emp.barangay, emp.city, emp.province].filter(Boolean).join(", ") || "No address"}</small>
        </td>
        <td><span class="badge ${statusClass}">${emp.status || "available"}</span></td>
        <td class="code">${emp.access_code || "N/A"}</td>
        <td><span class="badge ${codeClass}">${emp.code_status || "activated"}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-secondary me-1" onclick="viewEmployee('${emp.id}')">View</button>
          <button class="btn btn-sm btn-outline-primary" onclick="editEmployee('${emp.id}')">Edit</button>
        </td>
      </tr>
    `;
  });

  updateStats(employees);
}

function updateStats(employees) {
  const total = employees.length;
  const activeDrivers = employees.filter((emp) => String(emp.role).toLowerCase() === "driver" && ["active", "available"].includes(String(emp.status).toLowerCase())).length;
  const activeStaff = employees.filter((emp) => ["staff", "admin"].includes(String(emp.role).toLowerCase()) && ["active", "available"].includes(String(emp.status).toLowerCase())).length;
  const inactive = employees.filter((emp) => !["active", "available"].includes(String(emp.status).toLowerCase())).length;

  document.getElementById("totalEmp").innerText = String(total);
  document.getElementById("drivers").innerText = String(activeDrivers);
  document.getElementById("staff").innerText = String(activeStaff);
  document.getElementById("inactive").innerText = String(inactive);
}

async function loadEmployees() {
  try {
    const { data, error } = await supabaseClient
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch employees:", error);
      alert("Unable to load employees. Check console for details.");
      renderEmployees([]);
      return;
    }

    renderEmployees(data || []);
  } catch (error) {
    console.error("Unexpected loadEmployees error:", error);
    alert("Unexpected error while loading employees.");
    renderEmployees([]);
  }
}

function resetEmployeeForm() {
  document.getElementById("empEditId").value = "";
  document.getElementById("empName").value = "";
  document.getElementById("empBirthdate").value = "";
  document.getElementById("empGender").value = "";
  document.getElementById("empCivilStatus").value = "";
  document.getElementById("empPhone").value = "";
  document.getElementById("empEmail").value = "";
  document.getElementById("empEmergencyName").value = "";
  document.getElementById("empEmergencyPhone").value = "";
  document.getElementById("empStreet").value = "";
  document.getElementById("empBarangay").value = "";
  document.getElementById("empCity").value = "";
  document.getElementById("empProvince").value = "";
  document.getElementById("empRole").value = "";
  document.getElementById("empStatus").value = "Active";
  document.getElementById("empDateHired").value = "";
  document.getElementById("empLicense").value = "";
  document.getElementById("empAccessCode").value = generateAccessCode();
  document.getElementById("empCodeStatus").value = "Activated";
  setFormError("");
  toggleLicenseField();
}

async function updateEmployee() {
  const employeeId = document.getElementById("empEditId").value;
  if (!employeeId) {
    alert("Employee record not found.");
    return;
  }

  const formData = getEmployeeFormData();
  const validationError = validateEmployeeForm(formData);

  if (validationError) {
    setFormError(validationError);
    return;
  }

  setFormError("");

  const payload = {
    name: formData.name,
    birthdate: formatDateForDb(formData.birthdate),
    gender: formData.gender,
    civil_status: formData.civil_status,
    phone: formData.phone,
    email: formData.email,
    emergency_contact_name: formData.emergency_contact_name,
    emergency_contact_number: formData.emergency_contact_number,
    street: formData.street,
    barangay: formData.barangay,
    city: formData.city,
    province: formData.province,
    date_hired: formatDateForDb(formData.date_hired),
    license_number: formData.license_number,
    access_code: formData.access_code,
    code_status: formData.code_status,
    role: String(formData.role || "").toLowerCase(),
    status: String(formData.status || "active").toLowerCase()
  };

  try {
    const { error } = await supabaseClient
      .from("employees")
      .update(payload)
      .eq("id", employeeId);

    if (error) {
      console.error("Failed to update employee:", error);
      setFormError(error.message);
      alert(error.message);
      return;
    }

    alert("Employee updated successfully.");

    const modalElement = document.getElementById("employeeModal");
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) {
      modalInstance.hide();
    }

    setEmployeeModalMode("add");
    resetEmployeeForm();
    await loadEmployees();
  } catch (error) {
    console.error("Unexpected updateEmployee error:", error);
    alert("Unexpected error while updating employee.");
  }
}

async function addEmployee() {
  const formData = getEmployeeFormData();
  const validationError = validateEmployeeForm(formData);

  if (validationError) {
    setFormError(validationError);
    return;
  }

  setFormError("");

  const employeeId = await generateEmployeeId();
  const payload = {
    employee_id: employeeId,
    name: formData.name,
    birthdate: formatDateForDb(formData.birthdate),
    gender: formData.gender,
    civil_status: formData.civil_status,
    phone: formData.phone,
    email: formData.email,
    emergency_contact_name: formData.emergency_contact_name,
    emergency_contact_number: formData.emergency_contact_number,

    role: String(formData.role).toLowerCase(),

    // IMPORTANT: force correct status
    status: 'available',

    // IMPORTANT: ensure driver fields exist
    license_number: formData.license_number || null,
    access_code: formData.access_code || generateAccessCode(),
    code_status: 'Activated',

    street: formData.street,
    barangay: formData.barangay,
    city: formData.city,
    province: formData.province,
  };

  console.log("Employee Payload:", payload);

  try {
    const { error } = await supabaseClient
      .from("employees")
      .insert([payload]);

    if (error) {
      console.error(error);
      setFormError(error.message);
      alert(error.message);
      return;
    }

    alert("Employee added successfully");

    const modalElement = document.getElementById("employeeModal");
    const modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (modalInstance) {
      modalInstance.hide();
    }

    await loadEmployees();
    resetEmployeeForm();
  } catch (error) {
    console.error(error);
    setFormError(error.message || "Unexpected error while saving employee.");
    alert(error.message || "Unexpected error while saving employee.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const addEmployeeButton = document.querySelector("button[data-bs-target='#employeeModal']");
  const roleSelect = document.getElementById("empRole");
  const regenButton = document.getElementById("regenCodeBtn");
  const modalElement = document.getElementById("employeeModal");

  if (addEmployeeButton) {
    addEmployeeButton.addEventListener("click", () => {
      setEmployeeModalMode("add");
      resetEmployeeForm();
    });
  }

  if (roleSelect) {
    roleSelect.addEventListener("change", toggleLicenseField);
  }

  if (regenButton) {
    regenButton.addEventListener("click", () => {
      document.getElementById("empAccessCode").value = generateAccessCode();
    });
  }

  if (modalElement) {
    modalElement.addEventListener("show.bs.modal", () => {
      if (employeeFormMode === "add") {
        setEmployeeModalMode("add");
        resetEmployeeForm();
      }
    });
  }

  loadEmployees();
});