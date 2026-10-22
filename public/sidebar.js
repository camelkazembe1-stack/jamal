/* JAMALI shared sidebar: included on every page except index.html */
(() => {
  if (window.__jamaliSidebarInitialized) return;
  window.__jamaliSidebarInitialized = true;

  const pages = [
    { name: "Home", path: "/home/1.html" },
    { name: "Business", path: "/Business/2.html" },
    { name: "Add Transaction", path: "/Add%20Transaction/3.html" },
    { name: "View File", path: "/View%20File/4.html" }
  ];

  const style = document.createElement("style");
  style.id = "jamali-sidebar-style";
  style.textContent = `
    :root {
      --jamali-sidebar-width: 180px;
      --jamali-sidebar-button-width: 110px;
      --jamali-sidebar-button-height: 100px;
      --jamali-green: #16a34a;
      --jamali-green-hover: #15803d;
    }

    #jamali-sidebar {
      position: fixed;
      z-index: 99999;
      top: 0;
      left: 0;
      bottom: 0;
      width: var(--jamali-sidebar-width);
      padding: 16px 12px;
      box-sizing: border-box;
      background: #123b2b;
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      overflow-y: auto;
      overflow-x: hidden;
      box-shadow: 2px 0 10px #0002;
    }

    #jamali-sidebar .jamali-sidebar-title {
      box-sizing: border-box;
      width: 100%;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
      font-weight: 800;
      text-align: center;
      margin: 0;
    }

    #jamali-sidebar .jamali-sidebar-link {
      box-sizing: border-box;
      width: var(--jamali-sidebar-button-width);
      height: var(--jamali-sidebar-button-height);
      min-width: var(--jamali-sidebar-button-width);
      min-height: var(--jamali-sidebar-button-height);
      max-width: var(--jamali-sidebar-button-width);
      max-height: var(--jamali-sidebar-button-height);
      flex: 0 0 var(--jamali-sidebar-button-height);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 10px;
      border: 0;
      border-radius: 7px;
      background: var(--jamali-green);
      color: #ffffff;
      font-weight: 700;
      line-height: 1.3;
      text-align: center;
      text-decoration: none;
      overflow-wrap: anywhere;
      cursor: pointer;
    }

    #jamali-sidebar .jamali-sidebar-link:hover,
    #jamali-sidebar .jamali-sidebar-link:focus-visible {
      background: var(--jamali-green-hover);
      color: #ffffff;
      outline-offset: 3px;
    }

    body.jamali-has-sidebar {
      padding-left: var(--jamali-sidebar-width) !important;
      box-sizing: border-box;
    }

    /* Main-page action buttons remain square. */
    button,
    input[type="button"],
    input[type="submit"],
    input[type="reset"],
    .jamali-square-button,
    a.jamali-button,
    a[data-jamali-page] {
      box-sizing: border-box;
      width: 140px;
      height: 140px;
      min-width: 140px;
      min-height: 140px;
      max-width: 140px;
      max-height: 140px;
      aspect-ratio: 1 / 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      border: 0;
      border-radius: 8px;
      background: var(--jamali-green);
      color: #ffffff;
      font-weight: 700;
      text-align: center;
      text-decoration: none;
      overflow-wrap: anywhere;
      cursor: pointer;
    }

    button:hover,
    input[type="button"]:hover,
    input[type="submit"]:hover,
    input[type="reset"]:hover,
    .jamali-square-button:hover,
    a.jamali-button:hover,
    a[data-jamali-page]:hover {
      background: var(--jamali-green-hover);
      color: #ffffff;
    }

    @media (max-width: 600px) {
      #jamali-sidebar {
        position: relative;
        top: auto;
        left: auto;
        bottom: auto;
        width: 100%;
        height: auto;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: center;
      }

      #jamali-sidebar .jamali-sidebar-title {
        flex: 0 0 100%;
      }

      body.jamali-has-sidebar {
        padding-left: 0 !important;
      }
    }
  `;
  document.head.appendChild(style);

  function installSidebar() {
    if (!document.body || document.getElementById("jamali-sidebar")) return;

    const sidebarEl = document.createElement("nav");
    sidebarEl.id = "jamali-sidebar";
    sidebarEl.setAttribute("aria-label", "Main navigation");

    const title = document.createElement("div");
    title.className = "jamali-sidebar-title";
    title.textContent = "JAMALI";
    sidebarEl.appendChild(title);

    const currentPath = window.__jamaliCurrentPage || location.pathname;

    for (const page of pages) {
      const link = document.createElement("a");
      link.className = "jamali-sidebar-link";
      link.href = page.path;
      link.textContent = page.name;
      link.dataset.jamaliSidebarPath = page.path;
      if (decodeURIComponent(currentPath).toLowerCase() === decodeURIComponent(page.path).toLowerCase()) {
        link.setAttribute("aria-current", "page");
      }
      sidebarEl.appendChild(link);
    }

    document.body.prepend(sidebarEl);
    document.body.classList.add("jamali-has-sidebar");
  }

  async function navigate(path) {
    const target = new URL(path, location.origin);
    const response = await fetch(target.pathname, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Page request failed: ${response.status}`);

    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, "text/html");

    // Replace page-specific stylesheets while keeping this shared script/style.
    document.querySelectorAll('link[data-jamali-page-style]').forEach(el => el.remove());
    parsed.querySelectorAll('link[rel="stylesheet"]').forEach(oldLink => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = new URL(oldLink.getAttribute("href"), target).href;
      link.dataset.jamaliPageStyle = "true";
      document.head.appendChild(link);
    });

    document.title = parsed.title || target.pathname.split("/").filter(Boolean).pop();
    document.body.innerHTML = parsed.body ? parsed.body.innerHTML : html;
    document.body.classList.add("jamali-has-sidebar");
    window.__jamaliCurrentPage = target.pathname;
    installSidebar();

    // Execute the target page's scripts after its body is installed.
    for (const oldScript of parsed.querySelectorAll("script")) {
      const src = oldScript.getAttribute("src");
      if (!src && !oldScript.textContent.trim()) continue;
      if (src && new URL(src, target).pathname.endsWith("/sidebar.js")) continue;

      const script = document.createElement("script");
      if (src) script.src = new URL(src, target).href;
      else script.textContent = oldScript.textContent;
      for (const attr of oldScript.attributes) {
        if (attr.name !== "src") script.setAttribute(attr.name, attr.value);
      }
      document.body.appendChild(script);
    }
  }

  document.addEventListener("click", event => {
    const link = event.target.closest("a[data-jamali-sidebar-path]");
    if (!link) return;
    event.preventDefault();
    navigate(link.dataset.jamaliSidebarPath).catch(error => {
      console.error("JAMALI navigation failed:", error);
      // Fallback: open the destination if in-page loading cannot complete.
      location.href = link.dataset.jamaliSidebarPath;
    });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installSidebar, { once: true });
  } else {
    installSidebar();
  }
})();
