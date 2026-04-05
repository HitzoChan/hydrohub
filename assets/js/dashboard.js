const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
  window.location.href = "index.html";
}


new Chart(document.getElementById("salesChart"), {
  type: "line",
  data: {
    labels: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    datasets: [{
      label: "Sales (₱)",
      data: [4000,3800,5000,4500,6200,8000,6500],
      borderColor: "#0d6efd",
      backgroundColor: "rgba(13, 110, 253, 0.1)",
      tension: 0.4,
      fill: true,
      pointBackgroundColor: "#0d6efd",
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7
    }]
  },
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
          color: "rgba(0, 0, 0, 0.05)"
        },
        ticks: {
          callback: function(value) {
            return "₱" + value.toLocaleString();
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

new Chart(document.getElementById("deliveryChart"), {
  type: "bar",
  data: {
    labels: ["6AM","9AM","12PM","3PM","6PM","9PM"],
    datasets: [{
      label: "Deliveries",
      data: [15,25,35,40,30,20],
      backgroundColor: "rgba(32, 201, 151, 0.8)",
      borderColor: "#20c997",
      borderWidth: 1,
      borderRadius: 4,
      borderSkipped: false
    }]
  },
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
          color: "rgba(0, 0, 0, 0.05)"
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