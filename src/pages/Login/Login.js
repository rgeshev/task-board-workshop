import template from './Login.html?raw';
import './Login.css';

export function render(container) {
  container.innerHTML = template;

  return () => {};
}
