import template from './Footer.html?raw';
import './Footer.css';

export function renderFooter(container) {
  container.innerHTML = template;
}
