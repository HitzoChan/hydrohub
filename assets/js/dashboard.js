const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
  window.location.href = "index.html";
}

let deliveryChart = null;
let salesChart = null;

function getLastSevenDays() {
  const days = [];
  const today = new Date();

  for (let index = 6; index >= 0; index--) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    days.push(date);
  }

  return days;
}

function isSameDay(firstDate, secondDate) {
  return firstDate.toDateString() === secondDate.toDateString();
}

function getWeeklySalesData(orders) {
  const lastSevenDays = getLastSevenDays();

  return lastSevenDays.map((day) => {
    const dailySales = orders
      .filter((order) =>
        order.status === 'delivered' &&
        order.created_at &&
        isSameDay(new Date(order.created_at), day)
      )
      .reduce((sum, order) => sum + Number(order.total_price || 0), 0);

    return dailySales;
  });
}

function updateWeeklySalesChart(orders) {
  const canvas = document.getElementById('salesChart');

  if (!canvas) return;

  const lastSevenDays = getLastSevenDays();
  const labels = lastSevenDays.map((day) =>
    day.toLocaleDateString('en-US', { weekday: 'short' })
  );
  const salesData = getWeeklySalesData(orders);

  const chartData = {
    labels,
    datasets: [{
      label: 'Sales (₱)',
      data: salesData,
      borderColor: '#0d6efd',
      backgroundColor: 'rgba(13, 110, 253, 0.1)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#0d6efd',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7
    }]
  };

  if (salesChart) {
    salesChart.data = chartData;
    salesChart.update();
    return;
  }

  salesChart = new Chart(canvas, {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            callback: function(value) {
              return '₱' + Number(value).toLocaleString();
            }
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  });
}

function isToday(dateString) {
  const today = new Date();
  const date = new Date(dateString);

  return date.toDateString() === today.toDateString();
}

function getTodayDeliveries(orders) {
  return orders.filter(order =>
    isToday(order.created_at) &&
    order.status === 'delivered'
  );
}

function countTodayDeliveries(orders) {
  const todayOrders = getTodayDeliveries(orders);
  return todayOrders.length;
}

function groupByTime(orders) {
  const result = {
    morning: 0,
    afternoon: 0,
    evening: 0
  };

  orders.forEach(order => {
    const hour = new Date(order.created_at).getHours();

    if (hour < 12) result.morning++;
    else if (hour < 18) result.afternoon++;
    else result.evening++;
  });

  return result;
}

function updateTodayDeliveriesUI(orders) {
  const count = countTodayDeliveries(orders);
  const countElement = document.getElementById('todayDeliveriesCount');

  if (countElement) {
    countElement.innerText = count;
  }

  updateDeliveryChart(getTodayDeliveries(orders));
}

function updateDeliveryChart(todayDeliveries) {
  const timeBuckets = groupByTime(todayDeliveries);
  const canvas = document.getElementById('deliveryChart');

  if (!canvas) return;

  const chartData = {
    labels: ['Morning', 'Afternoon', 'Evening'],
    datasets: [{
      label: 'Today\'s Delivered Orders',
      data: [timeBuckets.morning, timeBuckets.afternoon, timeBuckets.evening],
      backgroundColor: ['rgba(13, 110, 253, 0.8)', 'rgba(32, 201, 151, 0.8)', 'rgba(255, 193, 7, 0.8)'],
      borderColor: ['#0d6efd', '#20c997', '#ffc107'],
      borderWidth: 1,
      borderRadius: 6,
      borderSkipped: false
    }]
  };

  if (deliveryChart) {
    deliveryChart.data = chartData;
    deliveryChart.update();
    return;
  }

  deliveryChart = new Chart(canvas, {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          precision: 0,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// ========================================
// TEST SUPABASE CONNECTION
// ========================================
async function testConnection() {
  try {
    const { data, error } = await supabaseClient
      .from('orders')
      .select('*')
      .limit(1);

    if (error) {
      throw error;
    }

    console.log('✅ Supabase connected successfully!');
    console.log('Sample data from orders table:', data);
    return true;

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error details:', error);
    alert(`⚠️ Supabase Connection Error: ${error.message}`);
    return false;
  }
}

// ========================================
// LOAD DASHBOARD STATS
// ========================================
async function loadDashboard() {
  try {
    const { data: orders, error: ordersError } = await supabaseClient
      .from('orders')
      .select('*');

    if (ordersError) throw ordersError;

    const totalOrders = orders.length;

    // ACTIVE ORDERS
    const activeOrders = orders.filter(order =>
      order.status === 'pending' ||
      order.status === 'on_the_way'
    ).length;

    // TOTAL CUSTOMERS
    const uniqueCustomers = new Set(
      orders.map(order => order.customer_id)
    ).size;

    // TOTAL REVENUE
    const revenue = orders.reduce((sum, order) =>
      sum + (order.total_price || 0), 0);

    updateTodayDeliveriesUI(orders);
    updateWeeklySalesChart(orders);

    // DISPLAY
    document.getElementById('totalOrders').innerText = totalOrders;
    document.getElementById('activeOrders').innerText = activeOrders;
    document.getElementById('totalCustomers').innerText = uniqueCustomers;
    document.getElementById('revenue').innerText = '₱' + revenue.toLocaleString();

  } catch (error) {
    console.error('Error loading dashboard:', error);
    document.getElementById('totalOrders').innerText = '0';
    document.getElementById('activeOrders').innerText = '0';
    document.getElementById('totalCustomers').innerText = '0';
    document.getElementById('revenue').innerText = '₱0';
    const countElement = document.getElementById('todayDeliveriesCount');
    if (countElement) {
      countElement.innerText = '0';
    }
  }
}

// ========================================
// LOAD RECENT TRANSACTIONS
// ========================================
async function loadRecentOrders() {
  try {
    const { data, error } = await supabaseClient
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    const container = document.getElementById('recentTransactions');
    container.innerHTML = '';

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="text-muted">No recent transactions</p>';
      return;
    }

    data.forEach(order => {
      const statusBadge = getStatusBadge(order.status);
      const date = new Date(order.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const row = `
        <div class="transaction">
          <span class="customer-name">${order.customer_name || 'N/A'}</span>
          <span class="date">${date}</span>
          <span class="amount">₱${(order.total_price || 0).toLocaleString()}</span>
          <span class="status">${statusBadge}</span>
        </div>
      `;
      container.innerHTML += row;
    });

  } catch (error) {
    console.error('Error loading recent orders:', error);
    const container = document.getElementById('recentTransactions');
    container.innerHTML = '<p class="text-muted">Unable to load transactions</p>';
  }
}

// ========================================
// HELPER FUNCTION - GET STATUS BADGE
// ========================================
function getStatusBadge(status) {
  const statusMap = {
    'pending': '<span class="badge bg-warning">Pending</span>',
    'on_the_way': '<span class="badge bg-info">In Transit</span>',
    'delivered': '<span class="badge bg-success">Delivered</span>',
    'cancelled': '<span class="badge bg-danger">Cancelled</span>',
    'completed': '<span class="badge bg-dark">Delivered</span>'
  };
  return statusMap[status] || `<span class="badge bg-secondary">${status}</span>`;
}

// ========================================
// INITIALIZE ON PAGE LOAD
// ========================================
window.onload = async () => {
  console.log('🔄 Initializing dashboard...');

  const isConnected = await testConnection();

  if (isConnected) {
    await loadDashboard();
    await loadRecentOrders();
    console.log('✅ Dashboard loaded successfully!');
  } else {
    console.warn('⚠️ Dashboard initialization paused due to connection failure');
  }
};
