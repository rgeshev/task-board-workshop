import { renderHeader } from '../Header/Header.js';
import { renderFooter } from '../Footer/Footer.js';
import { renderPageContent } from '../PageContent/PageContent.js';

let contentContainer = null;

export function initLayout() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div data-layout-header></div>
    <div data-layout-content></div>
    <div data-layout-footer></div>
  `;

  renderHeader(app.querySelector('[data-layout-header]'));
  contentContainer = renderPageContent(app.querySelector('[data-layout-content]'));
  renderFooter(app.querySelector('[data-layout-footer]'));
}

export function getPageContentContainer() {
  return contentContainer;
}
