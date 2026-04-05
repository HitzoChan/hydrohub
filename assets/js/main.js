function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (email === "admin" && password === "123456") {
    localStorage.setItem("user", JSON.stringify({
      email: email,
      role: "admin"
    }));

    window.location.href = "dashboard.html";
  } else {
    document.getElementById("error").innerText = "Invalid login credentials";
  }
}

/* =========================
   LOAD SIDEBAR (FIXED)
========================= */
async function loadSidebar() {
  const sidebarContainer = document.getElementById("sidebar-container");
  if (!sidebarContainer) return;

  try {
    // 🔥 AUTO PATH FIX
    const isInPages = window.location.pathname.includes("/pages/");
    const path = isInPages
      ? "../components/sidebar.html"
      : "components/sidebar.html";

    const res = await fetch(path);
    const data = await res.text();

    sidebarContainer.innerHTML = data;

    setActiveMenu();

  } catch (error) {
    console.error("Sidebar load error:", error);
  }
}

/* =========================
   ACTIVE MENU
========================= */
function setActiveMenu() {
  const currentPage = window.location.pathname.split("/").pop().replace(".html", "");

  document.querySelectorAll(".nav-link").forEach(link => {
    if (link.dataset.page === currentPage) {
      link.classList.add("active");
    }

    link.addEventListener("click", () => {
      // Handle navigation based on current location
      const isInPages = window.location.pathname.includes("/pages/");

      if (link.dataset.page === "dashboard") {
        window.location.href = isInPages ? "../dashboard.html" : "dashboard.html";
      } else {
        window.location.href = isInPages
          ? link.dataset.page + ".html"
          : "pages/" + link.dataset.page + ".html";
      }
    });
  });
}

/* =========================
   RUN AFTER LOAD (IMPORTANT)
========================= */
document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();
  loadHeader();
  loadFooter();
});


async function loadHeader() {
  const headerContainer = document.getElementById("header-container");
  if (!headerContainer) return;

  try {
    const isInPages = window.location.pathname.includes("/pages/");
    const path = isInPages
      ? "../components/header.html"
      : "components/header.html";

    const res = await fetch(path);
    const data = await res.text();

    headerContainer.innerHTML = data;

  } catch (error) {
    console.error("Header load error:", error);
  }
}

async function loadFooter() {
  const footerContainer = document.getElementById("footer-container");
  if (!footerContainer) return;

  try {
    const isInPages = window.location.pathname.includes("/pages/");
    const path = isInPages
      ? "../components/footer.html"
      : "components/footer.html";

    const res = await fetch(path);
    const data = await res.text();

    footerContainer.innerHTML = data;

  } catch (error) {
    console.error("Footer load error:", error);
  }
}