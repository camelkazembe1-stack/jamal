(() => {
  if (window.__jamaliNumberedPageRouter) return;
  window.__jamaliNumberedPageRouter = true;

  window.jamaliNavigate = async function(path) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) throw new Error("Page request failed: " + response.status);
      const html = await response.text();
      const parsed = new DOMParser().parseFromString(html, "text/html");

      document.title = parsed.title || "JAMALI";
      document.head.querySelectorAll(
        'link[data-jamali-page-style], link[data-jamali-business-style]'
      ).forEach(node => node.remove());

      const pageCss = parsed.querySelector('link[rel="stylesheet"][href]');
      if (pageCss) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = pageCss.getAttribute("href");
        css.dataset.jamaliPageStyle = "true";
        document.head.appendChild(css);
      }

      document.body.innerHTML = parsed.body.innerHTML;

      const pageScript = parsed.querySelector('script[src]');
      if (pageScript) {
        const script = document.createElement("script");
        script.src = pageScript.getAttribute("src");
        script.dataset.jamaliLoadedPageScript = "true";
        document.body.appendChild(script);
      }
    } catch (error) {
      console.error("JAMALI navigation error:", error);
      alert("This page could not be opened. Please check that the page exists.");
    }
  };

  document.addEventListener("click", event => {
    const link = event.target.closest("a[data-jamali-page]");
    if (!link) return;
    event.preventDefault();
    window.jamaliNavigate(link.getAttribute("data-jamali-page"));
  });
})();
