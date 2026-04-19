let mergedRows = [];
const geocodeCache = new Map();
const geocodeInFlight = new Map();
const GEOCODE_STORAGE_KEY = "deliveries_geocode_cache_v1";

function loadGeocodeCache() {
	try {
		const raw = localStorage.getItem(GEOCODE_STORAGE_KEY);
		if (!raw) return;
		const parsed = JSON.parse(raw);
		Object.entries(parsed || {}).forEach(([key, value]) => {
			if (typeof value === "string" && value.trim()) {
				geocodeCache.set(key, value);
			}
		});
	} catch (error) {
		console.warn("[Deliveries] Failed to load geocode cache:", error);
	}
}

function saveGeocodeCache() {
	try {
		const serializable = Object.fromEntries(geocodeCache.entries());
		localStorage.setItem(GEOCODE_STORAGE_KEY, JSON.stringify(serializable));
	} catch (error) {
		console.warn("[Deliveries] Failed to save geocode cache:", error);
	}
}

function getCoordsCacheKey(lat, lng) {
	const latitude = Number(lat);
	const longitude = Number(lng);
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
	return `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

async function reverseGeocodeAddress(lat, lng) {
	const key = getCoordsCacheKey(lat, lng);
	if (!key) return "";

	if (geocodeCache.has(key)) {
		return geocodeCache.get(key) || "";
	}

	if (geocodeInFlight.has(key)) {
		return geocodeInFlight.get(key);
	}

	const request = (async () => {
		const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(Number(lat))}&lon=${encodeURIComponent(Number(lng))}`;
		const response = await fetch(url, {
			headers: {
				"Accept": "application/json",
				"Accept-Language": "en",
			},
		});

		if (!response.ok) {
			throw new Error(`Nominatim request failed (${response.status})`);
		}

		const payload = await response.json();
		const resolved = String(payload?.display_name || "").trim();
		if (resolved) {
			geocodeCache.set(key, resolved);
			saveGeocodeCache();
		}

		return resolved;
	})();

	geocodeInFlight.set(key, request);

	try {
		return await request;
	} finally {
		geocodeInFlight.delete(key);
	}
}

async function cacheAddressTextInDatabase(row, addressText) {
	if (!addressText || !row || row.source_type !== "delivery" || !row.id) {
		return;
	}

	const { error } = await supabaseClient
		.from("deliveries")
		.update({ address_text: addressText })
		.eq("id", row.id);

	if (error) {
		console.warn("[Deliveries] Failed to cache address_text:", error);
	}
}

async function hydrateAddressesInBackground(rows) {
	const targets = (rows || []).filter((row) => {
		const hasAddressText = String(row?.address_text || "").trim().length > 0;
		const lat = Number(row?.latitude);
		const lng = Number(row?.longitude);
		return !hasAddressText && Number.isFinite(lat) && Number.isFinite(lng);
	}).slice(0, 20);

	if (!targets.length) return;

	let hasUpdates = false;
	const persistenceQueue = [];

	for (const row of targets) {
		try {
			const resolvedAddress = await reverseGeocodeAddress(row.latitude, row.longitude);
			if (!resolvedAddress) continue;

			row.address_text = resolvedAddress;
			hasUpdates = true;
			persistenceQueue.push(cacheAddressTextInDatabase(row, resolvedAddress));
		} catch (error) {
			console.warn("[Deliveries] Reverse geocode failed:", error);
		}
	}

	if (hasUpdates) {
		renderTable(mergedRows);
	}

	if (persistenceQueue.length) {
		await Promise.allSettled(persistenceQueue);
	}
}

function normalizeStatus(status) {
	if (status === "on_the_way") return "in_transit";
	if (status === "in_progress") return "in_transit";
	if (status === "completed") return "delivered";
	return status || "pending";
}

function resolveMergedStatus(orderStatus, deliveryStatus) {
	const normalizedOrderStatus = normalizeStatus(orderStatus);
	const normalizedDeliveryStatus = normalizeStatus(deliveryStatus);

	// Order terminal states should win over stale delivery states.
	if (normalizedOrderStatus === "delivered") {
		return "delivered";
	}

	if (normalizedOrderStatus === "cancelled") {
		return "cancelled";
	}

	return normalizedDeliveryStatus || normalizedOrderStatus || "pending";
}

function formatDeliveryId(id) {
	if (!id) return "-";
	return `DEL-${String(id).slice(0, 6).toUpperCase()}`;
}

function formatOrderId(id) {
	if (!id) return "-";
	return `ORD-${String(id).slice(-4).toUpperCase()}`;
}

function formatScheduleFromOrderType(type) {
	if (type === "scheduled") return "Scheduled";
	if (type === "now") return "Deliver Now";
	return "-";
}

function formatStatusBadge(status) {
	if (status === "delivered") return '<span class="status delivered">Delivered</span>';
	if (status === "assigned") return '<span class="status in-transit">Assigned</span>';
	if (status === "in_transit") return '<span class="status in-transit">In Transit</span>';
	if (status === "cancelled") return '<span class="status pending">Cancelled</span>';
	return '<span class="status pending">Pending</span>';
}

function formatEta(status) {
	if (status === "delivered") return '<span class="eta done">Completed</span>';
	if (status === "pending") return '<span class="eta pending">Not started</span>';
	return '<span class="eta">In progress</span>';
}

function formatAddressDisplay(row) {
	const addressText = String(row.address_text || "").trim();
	const lat = Number(row.latitude);
	const lng = Number(row.longitude);
	const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

	if (addressText) {
		return addressText;
	}

	if (hasCoords) {
		return `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
	}

	return "-";
}

function applyFilters(rows) {
	const query = (document.getElementById("deliverySearch")?.value || "").trim().toLowerCase();
	const statusFilter = document.getElementById("deliveryStatusFilter")?.value || "all";

	return rows.filter((row) => {
		const normalizedStatus = normalizeStatus(row.status);

		if (statusFilter !== "all" && normalizedStatus !== statusFilter) {
			return false;
		}

		if (!query) {
			return true;
		}

		const searchable = [
			formatOrderId(row.order_id),
			row.customer_name || "-",
			row.driver_name || "Unassigned",
			formatAddressDisplay(row),
		].join(" ").toLowerCase();

		return searchable.includes(query);
	});
}

function updateStats(rows, activeDriversCount) {
	const pending = rows.filter((row) => normalizeStatus(row.status) === "pending").length;
	const inTransit = rows.filter((row) => {
		const status = normalizeStatus(row.status);
		return status === "assigned" || status === "in_transit";
	}).length;
	const delivered = rows.filter((row) => normalizeStatus(row.status) === "delivered").length;

	const pendingEl = document.getElementById("pendingCount");
	const inTransitEl = document.getElementById("inTransitCount");
	const deliveredEl = document.getElementById("deliveredCount");
	const activeDriversEl = document.getElementById("activeDriversCount");

	if (pendingEl) pendingEl.textContent = String(pending);
	if (inTransitEl) inTransitEl.textContent = String(inTransit);
	if (deliveredEl) deliveredEl.textContent = String(delivered);
	if (activeDriversEl) activeDriversEl.textContent = String(activeDriversCount);
}

function renderTable(rows) {
	const tableBody = document.getElementById("deliveriesTableBody");
	const title = document.getElementById("deliveriesTitle");
	if (!tableBody) return;

	const filteredRows = applyFilters(rows);
	if (title) {
		title.textContent = `All Deliveries (${filteredRows.length})`;
	}

	if (!filteredRows.length) {
		tableBody.innerHTML = `
			<tr>
				<td colspan="9" class="text-center text-muted py-4">No deliveries found.</td>
			</tr>
		`;
		return;
	}

	tableBody.innerHTML = filteredRows.map((row) => {
		const status = normalizeStatus(row.status);
		const canAssign = row.source_type === "order_pending" && status === "pending" && !row.driver_id;
		const actionCell = canAssign
			? `<button class="btn btn-sm btn-primary" onclick="acceptAndAssignOrder('${row.order_id}')">Accept & Assign</button>`
			: "-";
		return `
			<tr>
				<td>${formatDeliveryId(row.id)}</td>
				<td class="text-muted">${formatOrderId(row.order_id)}</td>
				<td>${row.customer_name || "-"}</td>
				<td>${row.driver_name || "Unassigned"}</td>
				<td class="text-muted">${formatAddressDisplay(row)}</td>
				<td>${row.schedule || "-"}</td>
				<td>${formatEta(status)}</td>
				<td>${formatStatusBadge(status)}</td>
				<td class="text-end">${actionCell}</td>
			</tr>
		`;
	}).join("");
}

function closeAssignModal() {
	const modal = document.getElementById("assignModal");
	if (modal) {
		modal.style.display = "none";
	}
}

async function openAssignModal() {
	const modal = document.getElementById("assignModal");
	const orderSelect = document.getElementById("orderSelect");
	const driverSelect = document.getElementById("driverSelect");

	if (modal) {
		modal.style.display = "block";
	}

	const [{ data: orders, error: orderError }, { data: onlineDrivers, error: driverError }] = await Promise.all([
		supabaseClient
			.from("orders")
			.select("*")
			.eq("status", "pending"),
		supabaseClient
			.from("employees")
			.select("*")
			.eq("driver_status", "online"),
	]);

	if (orderError) {
		console.error(orderError);
		alert("Failed to load pending orders");
		return;
	}

	if (driverError) {
		console.error(driverError);
		alert("Failed to load online drivers");
		return;
	}

	if (orderSelect) {
		orderSelect.innerHTML = "";
		(orderSelect.options || []).length;
		(orders || []).forEach((order) => {
			orderSelect.innerHTML += `
				<option value="${order.id}">
					Order ${order.id} - ${order.customer_name || "Customer"}
				</option>
			`;
		});
	}

	if (driverSelect) {
		driverSelect.innerHTML = "";
		(onlineDrivers || []).forEach((driver) => {
			driverSelect.innerHTML += `
				<option value="${driver.id}">
					${driver.name || "Driver"}
				</option>
			`;
		});
	}
}

async function assignDelivery() {
	const orderId = document.getElementById("orderSelect")?.value;
	const driverId = document.getElementById("driverSelect")?.value;

	if (!orderId || !driverId) {
		alert("Please select order and driver");
		return;
	}

	const { data: orderRow, error: orderFetchError } = await supabaseClient
		.from("orders")
		.select("*")
		.eq("id", orderId)
		.single();

	if (orderFetchError || !orderRow) {
		console.error(orderFetchError);
		alert("Failed to load order before assigning delivery");
		return;
	}

	const { data: existingDelivery, error: existingDeliveryError } = await supabaseClient
		.from("deliveries")
		.select("id")
		.eq("order_id", orderId)
		.maybeSingle();

	if (existingDeliveryError) {
		console.error(existingDeliveryError);
		alert("Failed to verify existing delivery");
		return;
	}

	if (existingDelivery?.id) {
		const { error: updateDeliveryError } = await supabaseClient
			.from("deliveries")
			.update({
				driver_id: driverId,
				status: "assigned",
			})
			.eq("id", existingDelivery.id);

		if (updateDeliveryError) {
			console.error(updateDeliveryError);
			alert("Failed to update existing delivery");
			return;
		}
	} else {
		const { error: insertDeliveryError } = await supabaseClient
			.from("deliveries")
			.insert({
				order_id: orderRow.id,
				customer_id: orderRow.customer_id ?? null,
				customer_name: orderRow.customer_name || "-",
				address_id: orderRow.address_id ?? null,
				address_text: orderRow.delivery_address || orderRow.address || "-",
				latitude: orderRow.latitude ?? null,
				longitude: orderRow.longitude ?? null,
				schedule: formatScheduleFromOrderType(orderRow.delivery_type) || "Deliver Now",
				driver_id: driverId,
				status: "assigned",
			});

		if (insertDeliveryError) {
			console.error(insertDeliveryError);
			alert("Failed to create delivery record");
			return;
		}
	}

	const { error } = await supabaseClient
		.from("orders")
		.update({
			driver_id: driverId,
			status: "assigned"
		})
		.eq("id", orderId);

	if (error) {
		console.error(error);
		alert("Failed to assign delivery");
		return;
	}

	alert("Delivery assigned successfully!");
	closeAssignModal();

	if (typeof loadDeliveries === "function") {
		loadDeliveries();
	}

	if (typeof loadDeliveriesPageData === "function") {
		loadDeliveriesPageData();
	}
}

async function getFirstAvailableDriver() {
	const { data, error } = await supabaseClient
		.from("employees")
		.select("id, name")
		.eq("driver_status", "online")
		.order("id", { ascending: true })
		.limit(1);

	if (error) {
		throw error;
	}

	return Array.isArray(data) && data.length ? data[0] : null;
}

async function acceptAndAssignOrder(orderId) {
	const pendingRow = mergedRows.find((row) => row.source_type === "order_pending" && String(row.order_id) === String(orderId));

	if (!pendingRow) {
		alert("Pending order not found.");
		return;
	}

	try {
		const driver = await getFirstAvailableDriver();
		if (!driver) {
			alert("No available driver found.");
			return;
		}

		const { error: insertError } = await supabaseClient
			.from("deliveries")
			.insert({
				order_id: pendingRow.order_id,
				customer_id: pendingRow.customer_id ?? null,
				customer_name: pendingRow.customer_name || "-",
				address_id: pendingRow.address_id ?? null,
				address_text: pendingRow.address_text || "-",
				latitude: pendingRow.latitude ?? null,
				longitude: pendingRow.longitude ?? null,
				schedule: pendingRow.schedule || "-",
				driver_id: driver.id,
				status: "assigned",
			});

		if (insertError) {
			throw insertError;
		}

		const { error: updateError } = await supabaseClient
			.from("orders")
			.update({
				status: "assigned",
				driver_id: driver.id,
			})
			.eq("id", pendingRow.order_id);

		if (updateError) {
			throw updateError;
		}

		await loadDeliveriesPageData();
	} catch (error) {
		console.error("Accept & Assign failed:", error);
		alert("Failed to accept and assign order.");
	}
}

async function autoAssignDelivery() {
	try {
		console.log("[Deliveries] Auto-assign triggered");

		const { data: pendingOrders, error: orderError } = await supabaseClient
			.from("orders")
			.select("*")
			.eq("status", "pending")
			.order("created_at", { ascending: true })
			.limit(1);

		if (orderError) throw orderError;

		if (!pendingOrders || pendingOrders.length === 0) {
			alert("No pending orders available");
			return;
		}

		const order = pendingOrders[0];
		console.log("[Deliveries] Pending order selected:", order);

		const { data: settingsRow, error: settingsError } = await supabaseClient
			.from("system_settings")
			.select("max_deliveries_per_driver")
			.limit(1)
			.maybeSingle();

		if (settingsError) {
			throw settingsError;
		}

		const maxDeliveriesRaw = Number(settingsRow?.max_deliveries_per_driver);
		const maxDeliveriesPerDriver = Number.isFinite(maxDeliveriesRaw) && maxDeliveriesRaw > 0 ? maxDeliveriesRaw : 5;
		console.log("[Deliveries] max_deliveries_per_driver:", maxDeliveriesPerDriver);

		const { data: drivers, error: driverError } = await supabaseClient
			.from("employees")
			.select("id, name, status, driver_status")
			.or("status.eq.online,driver_status.eq.online");

		if (driverError) throw driverError;

		const onlineDrivers = (drivers || []).filter((driver) => {
			const status = String(driver.status || "").toLowerCase();
			const driverStatus = String(driver.driver_status || "").toLowerCase();
			return status === "online" || driverStatus === "online";
		});
		console.log("[Deliveries] ONLINE DRIVERS:", onlineDrivers);

		if (!onlineDrivers || onlineDrivers.length === 0) {
			alert("No online drivers available");
			return;
		}

		const { data: activeOrders, error: activeError } = await supabaseClient
			.from("orders")
			.select("id, driver_id, status")
			.in("status", ["assigned", "in_progress", "in_transit", "on_the_way"]);

		if (activeError) throw activeError;

		const loadMap = {};
		onlineDrivers.forEach((driver) => {
			loadMap[driver.id] = 0;
		});

		(activeOrders || []).forEach((activeOrder) => {
			if (activeOrder.driver_id && loadMap[activeOrder.driver_id] !== undefined) {
				loadMap[activeOrder.driver_id] += 1;
			}
		});

		console.log("[Deliveries] Driver load map:", loadMap);

		const availableDrivers = onlineDrivers.filter((driver) => loadMap[driver.id] < maxDeliveriesPerDriver);

		if (availableDrivers.length === 0) {
			alert(`All drivers are at maximum capacity (${maxDeliveriesPerDriver})`);
			return;
		}

		availableDrivers.sort((a, b) => loadMap[a.id] - loadMap[b.id]);

		const selectedDriver = availableDrivers[0];

		const selectedDriverStatus = String(selectedDriver.status || "").toLowerCase();
		const selectedDriverOnlineStatus = String(selectedDriver.driver_status || "").toLowerCase();
		if (selectedDriverStatus !== "online" && selectedDriverOnlineStatus !== "online") {
			alert("Driver is offline. Cannot assign.");
			return;
		}

		const { error: insertDeliveryError } = await supabaseClient
			.from("deliveries")
			.insert({
				order_id: order.id,
				customer_id: order.customer_id ?? null,
				customer_name: order.customer_name || "-",
				address_id: order.address_id ?? null,
				address_text: order.delivery_address || order.address || "-",
				latitude: order.latitude ?? null,
				longitude: order.longitude ?? null,
				schedule: formatScheduleFromOrderType(order.delivery_type) || "Deliver Now",
				driver_id: selectedDriver.id,
				status: "assigned",
			});

		if (insertDeliveryError) throw insertDeliveryError;

		const { error: assignError } = await supabaseClient
			.from("orders")
			.update({
				driver_id: selectedDriver.id,
				status: "assigned",
			})
			.eq("id", order.id);

		if (assignError) throw assignError;

		console.log("[Deliveries] Assigned order", order.id, "to", selectedDriver.name, "(", selectedDriver.id, ")");
		alert(`Assigned to ${selectedDriver.name}`);

		if (typeof loadDeliveriesPageData === "function") {
			await loadDeliveriesPageData();
		}
	} catch (err) {
		console.error("Auto-assign error:", err);
		alert("Failed to auto-assign delivery");
	}
}

async function loadDeliveriesPageData() {
	const [deliveriesResult, ordersResult, customersResult, driversResult] = await Promise.all([
		supabaseClient
			.from("deliveries")
			.select("*")
			.order("created_at", { ascending: false }),
		supabaseClient
			.from("orders")
			.select("*")
			.order("created_at", { ascending: false }),
		supabaseClient
			.from("customer_profiles")
			.select("*"),
		supabaseClient
			.from("employees")
			.select("id, name, driver_status"),
	]);

	if (deliveriesResult.error) {
		console.error("Failed to load deliveries:", deliveriesResult.error);
		alert("Unable to load deliveries right now.");
		mergedRows = [];
		renderTable(mergedRows);
		updateStats(mergedRows, 0);
		return;
	}

	console.log("ORDERS DATA:", ordersResult.data);
	console.log("ERROR:", ordersResult.error);

	if (ordersResult.error) {
		console.error("Orders load failed:", ordersResult.error.message || ordersResult.error);
	}

	if (customersResult.error) {
		console.error("Customers load failed:", customersResult.error.message || customersResult.error);
	}

	if (driversResult.error) {
		console.error("Failed to load drivers:", driversResult.error.message || driversResult.error);
	}

	const deliveries = Array.isArray(deliveriesResult.data) ? deliveriesResult.data : [];
	const orders = Array.isArray(ordersResult.data) ? ordersResult.data : [];
	const customers = Array.isArray(customersResult.data) ? customersResult.data : [];
	const allDrivers = Array.isArray(driversResult.data) ? driversResult.data : [];
	const onlineDriversCount = allDrivers.filter((driver) => String(driver.driver_status || "").toLowerCase() === "online").length;
	const driverNameMap = new Map(allDrivers.map((driver) => [String(driver.id), driver.name || "Unassigned"]));
	const customerNameMap = new Map();

	customers.forEach((customer) => {
		const fullName = customer.full_name || customer.name || customer.customer_name || null;
		if (!fullName) return;

		if (customer.user_id) {
			customerNameMap.set(String(customer.user_id), fullName);
		}

		if (customer.id) {
			customerNameMap.set(String(customer.id), fullName);
		}
	});

	const deliveriesByOrderId = new Map(deliveries.map((delivery) => [String(delivery.order_id), delivery]));

	mergedRows = orders.map((order) => {
		const delivery = deliveriesByOrderId.get(String(order.id));
		const customerKey = order.customer_id != null ? String(order.customer_id) : "";
		const resolvedCustomerName = customerNameMap.get(customerKey)
			|| order.customer_name
			|| delivery?.customer_name
			|| "Unknown";

		const resolvedDriverId = delivery?.driver_id || order.driver_id || null;
		const resolvedDriverName = resolvedDriverId
			? (driverNameMap.get(String(resolvedDriverId)) || "Unassigned")
			: "Unassigned";

		const resolvedAddressText = order.delivery_address
			|| order.address
			|| delivery?.address_text
			|| delivery?.address
			|| "";

		const resolvedLatitude = delivery?.latitude ?? order.latitude ?? null;
		const resolvedLongitude = delivery?.longitude ?? order.longitude ?? null;

		return {
			id: delivery?.id || order.id,
			source_type: delivery ? "delivery" : "order_pending",
			order_id: order.id,
			customer_id: order.customer_id ?? delivery?.customer_id ?? null,
			customer_name: resolvedCustomerName,
			address_id: order.address_id ?? delivery?.address_id ?? null,
			address_text: resolvedAddressText,
			latitude: resolvedLatitude,
			longitude: resolvedLongitude,
			schedule: formatScheduleFromOrderType(order.delivery_type) || delivery?.schedule || "Deliver Now",
			status: resolveMergedStatus(order.status, delivery?.status),
			driver_id: resolvedDriverId,
			driver_name: resolvedDriverName,
			created_at: order.created_at,
		};
	})
		.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

	renderTable(mergedRows);
	updateStats(mergedRows, onlineDriversCount);
	setTimeout(() => {
		hydrateAddressesInBackground(mergedRows);
	}, 0);
}

async function loadDeliveries() {
	return loadDeliveriesPageData();
}

window.acceptAndAssignOrder = acceptAndAssignOrder;
window.loadDeliveries = loadDeliveries;

async function openAssignModal() {
	console.log("Assign button clicked");

	const modal = document.getElementById("assignModal");
	const orderSelect = document.getElementById("orderSelect");
	const driverSelect = document.getElementById("driverSelect");

	if (modal) {
		modal.style.display = "block";
	}

	const [{ data: orders, error: orderError }, { data: onlineDrivers, error: driverError }] = await Promise.all([
		supabaseClient
			.from("orders")
			.select("*")
			.eq("status", "pending")
			.order("created_at", { ascending: false }),
		supabaseClient
			.from("employees")
			.select("*")
			.eq("driver_status", "online")
			.order("id", { ascending: true }),
	]);

	if (orderError) {
		console.error(orderError);
		alert("Failed to load pending orders");
		return;
	}

	if (driverError) {
		console.error(driverError);
		alert("Failed to load online drivers");
		return;
	}

	if (orderSelect) {
		orderSelect.innerHTML = "";
		(orders || []).forEach((order) => {
			orderSelect.innerHTML += `
				<option value="${order.id}">
					Order ${order.id} - ${order.customer_name || "Customer"}
				</option>
			`;
		});
	}

	if (driverSelect) {
		driverSelect.innerHTML = "";
		(onlineDrivers || []).forEach((driver) => {
			driverSelect.innerHTML += `
				<option value="${driver.id}">
					${driver.name || "Driver"}
				</option>
			`;
		});
	}
}

async function assignDelivery() {
	const orderId = document.getElementById("orderSelect")?.value;
	const driverId = document.getElementById("driverSelect")?.value;

	if (!orderId || !driverId) {
		alert("Please select order and driver");
		return;
	}

	const { error } = await supabaseClient
		.from("orders")
		.update({
			driver_id: driverId,
			status: "assigned",
		})
		.eq("id", orderId);

	if (error) {
		console.error(error);
		alert("Failed to assign delivery");
		return;
	}

	alert("Delivery assigned successfully!");
	closeAssignModal();

	if (typeof loadDeliveriesPageData === "function") {
		await loadDeliveriesPageData();
	}
}

window.openAssignModal = openAssignModal;
window.closeAssignModal = closeAssignModal;
window.assignDelivery = assignDelivery;
window.autoAssignDelivery = autoAssignDelivery;

document.addEventListener("DOMContentLoaded", async () => {
	loadGeocodeCache();

	const btn = document.getElementById("assignDeliveryBtn");
	if (btn) {
		btn.addEventListener("click", autoAssignDelivery);
	}

	document.getElementById("deliverySearch")?.addEventListener("input", () => renderTable(mergedRows));
	document.getElementById("deliveryStatusFilter")?.addEventListener("change", () => renderTable(mergedRows));

	await loadDeliveriesPageData();
});