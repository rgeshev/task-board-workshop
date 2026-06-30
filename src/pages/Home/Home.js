import template from './Home.html?raw';
import './Home.css';

export function render(container) {
  container.innerHTML = template;

  return () => {};
}
