addEventListener('load', () => {
  updateTheme();
  document.getElementById("dark-mode").addEventListener('click', event => {
    event.preventDefault();
    localStorage.setItem('darkMode', localStorage.getItem('darkMode') === 'true' ? 'false' : 'true');
    updateTheme();
  });
  function updateTheme() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    document.getElementById("light-theme").disabled = darkMode;
    document.getElementById("dark-theme").disabled = !darkMode;
  }
});