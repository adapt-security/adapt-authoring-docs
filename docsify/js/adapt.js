/* global addEventListener localStorage */

// options dynamically populated in docsify.js
window.$docsify = OPTIONS
/* global OPTIONS */

function onLoad () {
  updateTheme()
}

function darkModeClick (event) {
  event.preventDefault()
  localStorage.setItem('darkMode', localStorage.getItem('darkMode') === 'true' ? 'false' : 'true')
  updateTheme()
}

function updateTheme () {
  const darkMode = localStorage.getItem('darkMode') === 'true'
  document.getElementById('light-theme').disabled = darkMode
  document.getElementById('dark-theme').disabled = !darkMode
  const classList = document.getElementsByTagName('body')[0].classList
  darkMode ? classList.add('dark') : classList.remove('dark')
}

addEventListener('load', onLoad)
document.getElementById('dark-mode').addEventListener('click', darkModeClick)
