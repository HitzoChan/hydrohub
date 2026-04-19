// ========================================
// DRIVER ASSIGNMENT STATE
// ========================================
let lastAssignedIndex = -1;

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function hasAccessCode(value) {
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
}

function isAssignedStatus(status) {
  return status === 'assigned' || status === 'on_the_way';
}

function isAssignableDriverStatus(status) {
  const normalizedStatus = getNormalizedStatusForAssignment(status);
  return normalizedStatus === 'available' || normalizedStatus === 'busy';
}

function formatDriverLoad(activeOrdersCount, maxOrders = 5) {
  return `${activeOrdersCount}/${maxOrders}`;
}

async function getDriverActiveOrderCount(driverId) {
  const { data, error } = await supabaseClient
    .from('orders')
    .select('id')
    .eq('driver_id', driverId)
    .in('status', ['assigned', 'on_the_way']);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data.length : 0;
}

function getNormalizedStatusForAssignment(status) {
  const normalized = normalizeText(status);
  if (normalized === 'active') {
    // Optional resilience: treat legacy ACTIVE as available in assignment logic.
    return 'available';
  }
  return normalized;
}

// ========================================
// FETCH AVAILABLE DRIVERS
// ========================================
async function getAvailableDrivers() {
  try {
    const { data: drivers, error } = await supabaseClient
      .from('employees')
      .select('*')
      .eq('role', 'driver')
      .eq('driver_status', 'online')
      .order('id', { ascending: true });

    if (error) {
      console.error('Driver fetch error:', error);
      alert('Failed to fetch drivers');
      return [];
    }

    console.log('All drivers (role=driver):', drivers || []);

    const driverLoadCandidates = await Promise.all((drivers || []).map(async (driver) => {
      const statusForAssignment = getNormalizedStatusForAssignment(driver.status);
      const validAccessCode = hasAccessCode(driver.access_code);
      const isOnlineDriver = String(driver.driver_status || '').toLowerCase() === 'online';

      if (!isOnlineDriver || !isAssignableDriverStatus(driver.status) || !validAccessCode) {
        console.log('Driver filtered out:', {
          id: driver.id,
          name: driver.name,
          role: driver.role,
          status: driver.status,
          driver_status: driver.driver_status,
          normalizedStatus: statusForAssignment,
          access_code: driver.access_code,
          reason: [
            !isOnlineDriver ? 'driver_status not online' : null,
            !isAssignableDriverStatus(driver.status) ? 'status not assignable' : null,
            !validAccessCode ? 'access_code is null/empty' : null,
          ].filter(Boolean).join(', '),
        });
        return null;
      }

      try {
        const activeOrdersCount = await getDriverActiveOrderCount(driver.id);

        if (activeOrdersCount >= 5) {
          console.log('Driver filtered out due to load limit:', {
            id: driver.id,
            name: driver.name,
            activeOrdersCount,
            maxOrders: 5,
          });
          return null;
        }

        return {
          ...driver,
          activeOrdersCount,
        };
      } catch (loadError) {
        console.error('Failed to load driver order count:', {
          id: driver.id,
          name: driver.name,
          error: loadError,
        });
        return null;
      }
    }));

    const filteredDrivers = driverLoadCandidates.filter(Boolean);

    console.log('Filtered available drivers:', filteredDrivers);

    if (!filteredDrivers.length) {
      console.error('No assignable drivers found. Check driver status, access_code, or order load.');
      alert('No available drivers found. Please check driver status or order load.');
      return [];
    }

    return filteredDrivers;
  } catch (error) {
    console.error('Driver fetch error:', error);
    alert('Failed to fetch drivers');
    return [];
  }
}

// ========================================
// ROUND ROBIN DRIVER SELECTION
// ========================================
function getNextDriver(drivers) {
  if (!drivers.length) return null;

  lastAssignedIndex = (lastAssignedIndex + 1) % drivers.length;
  return drivers[lastAssignedIndex];
}

async function loadOrders() {
  try {
    const { data, error } = await supabaseClient
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("ORDERS DATA:", data);
    console.log("ERROR:", error);

    if (error) {
      console.error("Failed to load orders:", error);
      alert("Unable to load orders. Please check console for details.");
      return;
    }

    if (!data || data.length === 0) {
      console.warn("No orders returned");
    }

    const filteredOrders = applyFilters(data || []);
    displayOrders(filteredOrders);
  } catch (error) {
    console.error("Unexpected loadOrders error:", error);
    alert("Unexpected error while loading orders.");
  }
}

function applyFilters(orders) {
  const status = document.getElementById('statusFilter')?.value || 'all';
  const payment = document.getElementById('paymentFilter')?.value || 'all';
  const deliveryType = document.getElementById('deliveryTypeFilter')?.value || 'all';

  return orders.filter(order => {
    if (status !== 'all') {
      const matchesStatus = status === 'on_the_way'
        ? isAssignedStatus(order.status)
        : order.status === status;

      if (!matchesStatus) {
        return false;
      }
    }

    if (payment !== 'all' && order.payment_status !== payment) {
      return false;
    }

    if (deliveryType !== 'all' && order.delivery_type !== deliveryType) {
      return false;
    }

    return true;
  });
}

function displayOrders(orders) {
  const table = document.getElementById("ordersTable");
  const title = document.getElementById("ordersTableTitle");

  if (!table) {
    console.error("ordersTable tbody not found.");
    return;
  }

  table.innerHTML = "";
  if (title) {
    title.textContent = `All Orders (${orders.length})`;
  }

  updateOrderStats(orders);

  if (!orders.length) {
    table.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-muted py-4">No orders found.</td>
      </tr>
    `;
    return;
  }

  orders.forEach((order) => {
    const row = `
      <tr>
        <td title="${order.id ?? ""}">${formatOrderId(order.id)}</td>
        <td>${order.customer_name ?? "N/A"}</td>
        <td>${order.gallons ?? 0} Gallons</td>
        <td class="text-success">₱${Number(order.total_price || 0).toLocaleString()}</td>
        <td>${order.exchange ? "With Exchange" : "Without Exchange"}</td>
        <td>${formatDeliveryType(order.delivery_type)}</td>
        <td title="${order.driver_id || ""}">${formatDriverId(order.driver_id)}</td>
        <td>${formatStatus(order.status)}</td>
        <td>${formatTime(order.created_at)}</td>
      </tr>
    `;
    table.innerHTML += row;
  });
}

function formatOrderId(id) {
  if (!id) return '';

  const short = String(id).substring(String(id).length - 4).toUpperCase();

  return `ORD-${short}`;
}

function updateOrderStats(orders) {
  const totalOrdersStat = document.getElementById("totalOrdersStat");
  const pendingOrdersStat = document.getElementById("pendingOrdersStat");
  const onTheWayOrdersStat = document.getElementById("onTheWayOrdersStat");
  const deliveredOrdersStat = document.getElementById("deliveredOrdersStat");

  const pending = orders.filter((order) => order.status === "pending").length;
  const onTheWay = orders.filter((order) => isAssignedStatus(order.status)).length;
  const delivered = orders.filter((order) => order.status === "delivered").length;

  if (totalOrdersStat) totalOrdersStat.textContent = String(orders.length);
  if (pendingOrdersStat) pendingOrdersStat.textContent = String(pending);
  if (onTheWayOrdersStat) onTheWayOrdersStat.textContent = String(onTheWay);
  if (deliveredOrdersStat) deliveredOrdersStat.textContent = String(delivered);
}

function formatStatus(status) {
  if (status === "pending") return "🟠 Pending";
  if (status === "assigned") return "🔵 Assigned";
  if (status === "on_the_way") return "🔵 On the Way";
  if (status === "delivered") return "🟢 Delivered";
  return status || "Unknown";
}

function formatDeliveryType(type) {
  if (type === "now") return "Now";
  if (type === "scheduled") return "Scheduled";
  return "N/A";
}

function formatTime(date) {
  if (!date) return "N/A";
  return new Date(date).toLocaleString();
}

function formatDriverId(driverId) {
  if (!driverId) return "Unassigned";

  const value = String(driverId);
  if (value.length <= 8) return value;

  return `${value.slice(0, 8)}...`;
}

async function acceptOrder(orderId) {
  try {
    console.log(`Accepting order ${orderId}...`);

    const { data: currentOrder, error: currentOrderError } = await supabaseClient
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (currentOrderError) {
      console.error('Failed to fetch current order status:', currentOrderError);
      alert('Failed to verify order status. Please try again.');
      return;
    }

    if (currentOrder?.status === 'on_the_way') {
      console.log(`Order ${orderId} is already on the way. Leaving existing status unchanged.`);
      alert('This order is already on the way.');
      await loadOrders();
      return;
    }

    // Fetch available drivers
    const drivers = await getAvailableDrivers();

    if (!drivers.length) {
      alert('No available drivers found. Please check driver status.');
      return;
    }

    // Get next driver using round-robin
    const selectedDriver = getNextDriver(drivers);
    if (!selectedDriver) {
      alert('No available drivers found. Please check driver status.');
      return;
    }

    if (String(selectedDriver.driver_status || '').toLowerCase() !== 'online') {
      alert('Driver is offline');
      await loadOrders();
      return;
    }

    const currentLoad = typeof selectedDriver.activeOrdersCount === 'number'
      ? selectedDriver.activeOrdersCount
      : await getDriverActiveOrderCount(selectedDriver.id);

    if (currentLoad >= 5) {
      console.warn('Selected driver is at capacity:', {
        id: selectedDriver.id,
        name: selectedDriver.name,
        activeOrdersCount: currentLoad,
      });
      alert(`Driver already has maximum orders (${formatDriverLoad(currentLoad)}).`);
      await loadOrders();
      return;
    }

    console.log('Selected driver:', selectedDriver);
    console.log(`Assigning driver: ${selectedDriver.name} (${selectedDriver.id}) with load ${formatDriverLoad(currentLoad)}`);

    // Update order with driver and status
    const { error: orderError } = await supabaseClient
      .from('orders')
      .update({
        driver_id: selectedDriver.id,
        status: 'assigned'
      })
      .eq('id', orderId);

    if (orderError) {
      console.error('Failed to assign driver to order:', orderError);
      alert('Failed to assign driver. Please try again.');
      return;
    }

    // Update driver status to busy
    const { error: driverError } = await supabaseClient
      .from('employees')
      .update({ status: 'busy' })
      .eq('id', selectedDriver.id);

    if (driverError) {
      console.error('Failed to update driver status:', driverError);
    }

    console.log(`✅ Order ${orderId} assigned to driver ${selectedDriver.name} (${formatDriverLoad(currentLoad + 1)})`);
    alert(`Order assigned to ${selectedDriver.name} (${formatDriverLoad(currentLoad + 1)})`);
    await loadOrders();
  } catch (error) {
    console.error('Unexpected acceptOrder error:', error);
    alert('Unexpected error while accepting order.');
  }
}

async function completeOrder(id) {
  try {
    console.log(`Completing order ${id}...`);

    // Fetch the order to get the driver
    const { data: orderData, error: fetchError } = await supabaseClient
      .from('orders')
      .select('driver_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !orderData) {
      console.error('Failed to fetch order:', fetchError);
      alert('Failed to fetch order details.');
      return;
    }

    const driverId = orderData.driver_id;

    // Update order status to delivered
    const { error: orderError } = await supabaseClient
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', id);

    if (orderError) {
      console.error('Failed to update order status to delivered:', orderError);
      alert('Failed to complete order. Please try again.');
      return;
    }

    // If order had a driver, set driver back to available
    if (driverId) {
      const { error: driverError } = await supabaseClient
        .from('employees')
        .update({ status: 'available' })
        .eq('id', driverId);

      if (driverError) {
        console.error('Failed to set driver available:', driverError);
      }
    }

    console.log(`✅ Order ${id} completed`);
    alert('Order marked as completed.');
    await loadOrders();
  } catch (error) {
    console.error('Unexpected completeOrder error:', error);
    alert('Unexpected error while completing order.');
  }
}

window.onload = () => {
  loadOrders();
};

document.getElementById('statusFilter')?.addEventListener('change', loadOrders);
document.getElementById('paymentFilter')?.addEventListener('change', loadOrders);

const deliveryFilter = document.getElementById('deliveryTypeFilter');
if (deliveryFilter) {
  deliveryFilter.addEventListener('change', loadOrders);
}