import template from './Dashboard.html?raw';
import './Dashboard.css';

export function render(container) {
  container.innerHTML = template;

  return () => {};
}
