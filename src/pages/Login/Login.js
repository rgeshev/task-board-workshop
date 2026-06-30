import template from './Login.html?raw';
import './Login.css';
import { signIn, signUp } from '../../lib/auth.js';
import { navigate } from '../../router/router.js';
import { toast } from '../../lib/toast.js';

const COPY = {
  login: {
    title: 'Login to your account',
    subtitle: 'Manage your projects in seconds',
    eyebrow: 'Welcome back',
    sideTitle: 'Pick up right where you',
    sideHighlight: 'left off',
    sideText:
      'Sign in to open your boards, move tasks across stages and keep your projects flowing.',
  },
  register: {
    title: 'Create your account',
    subtitle: 'Start organizing projects in minutes',
    eyebrow: 'Get started',
    sideTitle: 'Your next project starts',
    sideHighlight: 'right here',
    sideText:
      'Register to create boards, add stages and track tasks with a beautiful kanban workflow.',
  },
};

function setMode(container, mode) {
  const isLogin = mode === 'login';

  container.querySelectorAll('[data-mode]').forEach((tab) => {
    const active = tab.getAttribute('data-mode') === mode;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  container.querySelector('[data-login-form]').classList.toggle('d-none', !isLogin);
  container.querySelector('[data-register-form]').classList.toggle('d-none', isLogin);

  const copy = COPY[mode];
  container.querySelector('[data-form-title]').textContent = copy.title;
  container.querySelector('[data-form-subtitle]').textContent = copy.subtitle;
  container.querySelector('[data-login-side-eyebrow]').textContent = copy.eyebrow;
  container.querySelector('[data-login-side-title]').textContent = copy.sideTitle;
  container.querySelector('[data-login-side-highlight]').textContent = copy.sideHighlight;
  container.querySelector('[data-login-side-text]').textContent = copy.sideText;
}

function setLoading(form, loading) {
  const btn = form.querySelector('[data-submit-btn]');
  btn.disabled = loading;
  if (loading) {
    btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Please wait…';
  } else if (btn.dataset.originalHtml) {
    btn.innerHTML = btn.dataset.originalHtml;
  }
}

export function render(container) {
  container.innerHTML = template;

  let mode = 'login';

  const onTabClick = (event) => {
    const tab = event.target.closest('[data-mode]');
    if (!tab) return;
    mode = tab.getAttribute('data-mode');
    setMode(container, mode);
  };

  const onLoginSubmit = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
      toast.error('Please enter your email and password.');
      return;
    }

    setLoading(form, true);

    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (error) {
      toast.fromError(error, 'Login failed. Please try again.');
    } finally {
      setLoading(form, false);
    }
  };

  const onRegisterSubmit = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirm = form.confirm.value;

    if (!email || !password) {
      toast.error('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(form, true);

    try {
      const { session } = await signUp(email, password);

      if (session) {
        navigate('/dashboard');
        return;
      }

      toast.success('Account created! Check your email to confirm, then log in.');
      setMode(container, 'login');
      form.reset();
    } catch (error) {
      toast.fromError(error, 'Registration failed. Please try again.');
    } finally {
      setLoading(form, false);
    }
  };

  container.querySelector('.login-page__tabs').addEventListener('click', onTabClick);
  container.querySelector('[data-login-form]').addEventListener('submit', onLoginSubmit);
  container.querySelector('[data-register-form]').addEventListener('submit', onRegisterSubmit);

  setMode(container, mode);

  return () => {
    container.querySelector('.login-page__tabs')?.removeEventListener('click', onTabClick);
    container.querySelector('[data-login-form]')?.removeEventListener('submit', onLoginSubmit);
    container.querySelector('[data-register-form]')?.removeEventListener('submit', onRegisterSubmit);
  };
}
