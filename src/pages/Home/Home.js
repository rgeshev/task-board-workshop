import template from './Home.html?raw';
import './Home.css';
import { renderLiveBackground } from '../../components/LiveBackground/LiveBackground.js';

export function render(container) {
  container.innerHTML = template;

  const bgHost = container.querySelector('[data-live-bg]');
  const cleanupBg = bgHost ? renderLiveBackground(bgHost) : () => {};

  return () => {
    cleanupBg();
  };
}
