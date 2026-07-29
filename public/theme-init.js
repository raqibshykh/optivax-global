// Applies the saved theme before first paint so a dark-mode user never
// sees a flash of the light theme while React/ThemeContext initializes
// (ThemeContext itself only applies the class inside a useEffect, which
// runs after the first render).
//
// Lives in its own file (not inline in index.html) so the site's CSP can
// use `script-src 'self'` with no 'unsafe-inline' — an inline <script>
// block would otherwise force weakening the CSP just for this one snippet.
(function () {
  try {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {
    // localStorage unavailable (privacy mode, etc.) — default to light, unchanged.
  }
})();
