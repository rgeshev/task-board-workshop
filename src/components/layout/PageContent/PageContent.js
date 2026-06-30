import template from './PageContent.html?raw';
import './PageContent.css';

export function renderPageContent(container) {
  container.innerHTML = template;
  return container.querySelector('[data-page-content]');
}
