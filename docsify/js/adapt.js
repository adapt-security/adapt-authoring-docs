window.$docsify = {
  name: '<img class="logo" src="assets/logo-colour.png" />Adapt authoring tool<h2>Developer guides</h2>',
  repo: 'https://github.com/adapt-security/adapt-authoring',
  themeColor: '#36cde8',
  loadSidebar: true,
  loadNavbar: false,
  autoHeader: true,
  coverpage: true
}

function onLoad() {
  addSizeClass();
  updateTheme();
}

function addSizeClass() {
  const sizes = [
    ['size-xl', 1400],
    ['size-l', 1024],
    ['size-m', 768],
    ['size-s', 0]
  ];
  document.body.classList.remove(...sizes.map(s => s[0]));
  sizes.some(([className, size]) => {
    if(document.body.clientWidth < size) return;
    document.body.classList.add(className);
    return true;
  });
}

function darkModeClick(event) {
  event.preventDefault();
  localStorage.setItem('darkMode', localStorage.getItem('darkMode') === 'true' ? 'false' : 'true');
  updateTheme();
}

function updateTheme() {
  const darkMode = localStorage.getItem('darkMode') === 'true';
  document.getElementById("light-theme").disabled = darkMode;
  document.getElementById("dark-theme").disabled = !darkMode;
  const classList = document.getElementsByTagName("body")[0].classList;
  darkMode ? classList.add('dark') : classList.remove('dark');
}

addEventListener('load', onLoad);
addEventListener('resize', addSizeClass);
document.getElementById("dark-mode").addEventListener('click', darkModeClick);