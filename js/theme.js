
/* HCM Lite — Theme controller */

(() => {
  const root = document.documentElement;
  const toggle = document.getElementById("theme-toggle");

  if (!toggle) return;

  const storageKey = "hcm_theme";

  function applyTheme(theme) {
    const selectedTheme = theme === "dark" ? "dark" : "light";

    root.dataset.theme = selectedTheme;

    const isDark = selectedTheme === "dark";

    toggle.textContent = isDark ? "Light mode" : "Dark mode";
    toggle.setAttribute(
      "aria-label",
      isDark ? "Switch to light theme" : "Switch to dark theme"
    );
  }

  // Load the saved preference safely.
  let savedTheme = "light";

  try {
    savedTheme = localStorage.getItem(storageKey) || "light";
  } catch (error) {
    console.warn("Theme preference could not be read.", error);
  }

  applyTheme(savedTheme);

  toggle.addEventListener("click", () => {
    const nextTheme =
      root.dataset.theme === "dark" ? "light" : "dark";

    applyTheme(nextTheme);

    try {
      localStorage.setItem(storageKey, nextTheme);
    } catch (error) {
      console.warn("Theme preference could not be saved.", error);
    }
  });
})();
