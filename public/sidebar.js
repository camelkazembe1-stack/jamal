/**
 * JAMALI — JMS Multisystem Management
 * Shared sidebar component.
 *
 * Usage:
 *   <nav id="jamali-sidebar"></nav>
 *   <script type="module" src="/sidebar.js"></script>
 *
 * The sidebar is rendered only when the page includes
 * an element with id="jamali-sidebar".
 */

const SIDEBAR_STYLES = `
  .jamali-sidebar {
    box-sizing: border-box;
    width: 248px;
    min-width: 248px;
    min-height: 100vh;
    padding: 24px 16px;
    background: #123b2a;
    color: #ffffff;
    font-family: Arial, Helvetica, sans-serif;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .jamali-sidebar *,
  .jamali-sidebar *::before,
  .jamali-sidebar *::after {
    box-sizing: border-box;
  }

  .jamali-sidebar__brand {
    display: flex;
    align-items: center;
    gap: 12px;
    color: inherit;
    text-decoration: none;
  }

  .jamali-sidebar__logo {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: #198047;
    color: #ffffff;
    font-size: 18px;
    font-weight: 800;
  }

  .jamali-sidebar__brand-name {
    font-size: 14px;
    font-weight: 700;
    line-height: 1.4;
  }

  .jamali-sidebar__caption {
    margin: 0 0 8px;
    color: #a9c7b6;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .jamali-sidebar__nav {
    display: grid;
    gap: 8px;
  }

  .jamali-sidebar__link {
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid transparent;
    border-radius: 10px;
    color: #e5f2e9;
    text-decoration: none;
    font-size: 13px;
    transition: background 150ms ease, border-color 150ms ease;
  }

  .jamali-sidebar__link:hover {
    background: #20543c;
  }

  .jamali-sidebar__link[aria-current="page"] {
    background: #246543;
    border-color: #43845f;
    color: #ffffff;
    font-weight: 700;
  }

  .jamali-sidebar__icon {
    width: 22px;
    flex-shrink: 0;
    text-align: center;
    font-size: 17px;
  }

  .jamali-sidebar__footer {
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid #315d47;
    color: #a9c7b6;
    font-size: 11px;
    line-height: 1.6;
  }

  @media (max-width: 700px) {
    .jamali-sidebar {
      width: 100%;
      min-width: 0;
      min-height: auto;
      padding: 14px;
      gap: 16px;
    }

    .jamali-sidebar__nav {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .jamali-sidebar__footer {
      margin-top: 0;
    }
  }
`;

function addSidebarStyles() {
  if (document.getElementById("jamali-sidebar-styles")) return;

  const style = document.createElement("style");
  style.id = "jamali-sidebar-styles";
  style.textContent = SIDEBAR_STYLES;
  document.head.appendChild(style);
}

function getCurrentPage() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || path.endsWith("/index.html")) return "home";
  if (path.includes("/business/")) return "business";
  if (path.includes("/home/")) return "home";
  return "";
}

function createSidebar(container) {
  addSidebarStyles();

  container.classList.add("jamali-sidebar");
  container.setAttribute("aria-label", "JAMALI navigation");

  const currentPage = getCurrentPage();

  const links = [
    {
      id: "home",
      label: "Home",
      icon: "⌂",
      href: "/home/1.html"
    },
    {
      id: "business",
      label: "Business",
      icon: "▤",
      href: "/business/3.html"
    }
  ];

  container.innerHTML = `
    <a class="jamali-sidebar__brand" href="/" aria-label="JAMALI home">
      <span class="jamali-sidebar__logo" aria-hidden="true">JMS</span>
      <span class="jamali-sidebar__brand-name">
        JMS Multisystem Management
      </span>
    </a>

    <div>
      <p class="jamali-sidebar__caption">Workspace</p>
      <nav class="jamali-sidebar__nav">
        ${links.map(link => `
          <a
            class="jamali-sidebar__link"
            href="${link.href}"
            ${currentPage === link.id ? 'aria-current="page"' : ""}
          >
            <span class="jamali-sidebar__icon" aria-hidden="true">${link.icon}</span>
            <span>${link.label}</span>
          </a>
        `).join("")}
      </nav>
    </div>

    <footer class="jamali-sidebar__footer">
      JMS Multisystem Management<br>
      Management made simple.
    </footer>
  `;
}

function initializeSidebar() {
  document.querySelectorAll("#jamali-sidebar").forEach(createSidebar);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSidebar, { once: true });
} else {
  initializeSidebar();
}
