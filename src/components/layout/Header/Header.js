import template from './Header.html?raw';
import './Header.css';

export function renderHeader(container) {
  container.innerHTML = template;
}
