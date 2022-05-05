const container = document.createElement('div');
container.className = 'main-page-title';

const mainTitle = document.createElement('h1');
mainTitle.appendChild(document.createTextNode(document.querySelector('meta[name="description"]').content));
container.append(mainTitle);

const subTitle = document.createElement('h2');
subTitle.appendChild(document.createTextNode(document.querySelector('meta[name="keyword"]').content));
container.append(subTitle);

document.querySelector('#main').prepend(container);