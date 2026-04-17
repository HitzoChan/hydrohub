// ========================================
// LOAD CUSTOMERS FROM CUSTOMER_PROFILES
// ========================================
async function loadCustomers() {
  try {
    console.log("Loading customers...");

    const { data: profiles, error: profileError } = await supabaseClient
      .from("customer_profiles")
      .select("user_id, id, name, email, phone, address, created_at");

    if (profileError) throw profileError;

    console.log("RAW PROFILES:", profiles);

    const { data: orders, error: ordersError } = await supabaseClient
      .from("orders")
      .select("customer_id, customer_name, address, created_at");

    if (ordersError) {
      console.error("Orders fetch error:", ordersError);
    }

    const orderCount = {};
    (orders || []).forEach(o => {
      orderCount[o.customer_id] = (orderCount[o.customer_id] || 0) + 1;
    });

    let customers = [];

    if (profiles && profiles.length > 0) {
      customers = profiles.map(p => {
        console.log("EMAIL:", p.email);
        const profileId = p.user_id || p.id;
        return {
          id: profileId,
          name: p.name || "N/A",
          email: p.email || "-",
          phone: p.phone || "-",
          address: p.address || "No address",
          orders: orderCount[profileId] || 0,
          last_order: p.created_at || new Date().toISOString(),
          status: "Active"
        };
      });
    } else {
      console.warn("customer_profiles returned empty. Falling back to orders table data.");

      const customersMap = {};
      (orders || []).forEach(o => {
        const id = o.customer_id;
        if (!id) return;

        if (!customersMap[id]) {
          customersMap[id] = {
            id,
            name: o.customer_name || "N/A",
            email: "-",
            phone: "-",
            address: o.address || "No address",
            orders: 0,
            last_order: o.created_at || new Date().toISOString(),
            status: "Active"
          };
        }

        customersMap[id].orders += 1;

        if (o.address) {
          customersMap[id].address = o.address;
        }

        if (o.created_at && new Date(o.created_at) > new Date(customersMap[id].last_order)) {
          customersMap[id].last_order = o.created_at;
        }
      });

      customers = Object.values(customersMap);
    }

    console.log("CUSTOMERS FOR RENDER:", customers);

    renderCustomers(customers);
  } catch (err) {
    console.error("Error loading customers:", err);
    alert("Error loading customers: " + err.message);
  }
}

// ========================================
// RENDER TABLE
// ========================================
function renderCustomers(customers) {
  const table = document.getElementById("customersTable");

  if (!customers || customers.length === 0) {
    table.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted py-4">No customers found.</td>
      </tr>
    `;
    return;
  }

  table.innerHTML = customers.map(c => {
    const status = getStatus(c.last_order);

    return `
      <tr>
          <td class="fw-semibold">${c.name || "N/A"}</td>
          <td>${c.phone || "-"}</td>
          <td class="text-muted" title="${c.email}">${c.email || "-"}</td>
          <td>${c.address || "No address"}</td>
        <td><span class="orders-badge">${c.orders} ${c.orders === 1 ? 'order' : 'orders'}</span></td>
        <td><span class="status-badge ${status === 'Active' ? 'active' : 'inactive'}">${status}</span></td>
        <td class="text-end">
          <i class="bi bi-eye action-icon" title="View"></i>
          <i class="bi bi-chat action-icon" title="Message"></i>
        </td>
      </tr>
    `;
  }).join("");
}

// ========================================
// STATUS LOGIC
// ========================================
function getStatus(date) {
  const now = new Date();
  const last = new Date(date);
  const diff = (now - last) / (1000 * 60 * 60 * 24);

  return diff <= 30 ? "Active" : "Inactive";
}

// ========================================
// INITIALIZE
// ========================================
window.onload = loadCustomers;