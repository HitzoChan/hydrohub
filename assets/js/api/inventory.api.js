// READY FOR SUPABASE

export async function getInventoryStats() {
  // return totals: full, empty, with customers
}

export async function recordDelivery(data) {
  // decrease full, increase with customers
}

export async function recordReturn(data) {
  // decrease with customers, increase empty
}

export async function adjustInventory(data) {
  // manual correction
}

export async function getCustomerContainers() {
  // return customers with containers
}

export async function getTransactionHistory() {
  // return logs
}