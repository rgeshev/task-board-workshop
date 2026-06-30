import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './styles/global.css';
import { initAuthListener } from './lib/auth.js';
import { refreshHeaderAuth } from './components/layout/Header/Header.js';
import { initRouter } from './router/router.js';

initAuthListener(refreshHeaderAuth);
initRouter();
