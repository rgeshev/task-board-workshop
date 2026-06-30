import { Modal } from 'bootstrap';
import './ConfirmModal.css';

let modalEl = null;
let modalInstance = null;
let resolvePromise = null;

function ensureModal() {
  if (modalEl) return modalEl;

  modalEl = document.createElement('div');
  modalEl.className = 'modal fade confirm-modal';
  modalEl.tabIndex = -1;
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header border-0 pb-0">
          <div class="d-flex align-items-center gap-3">
            <span class="confirm-modal__icon"><i class="bi bi-exclamation-triangle-fill"></i></span>
            <h2 class="modal-title h5 mb-0" data-confirm-title>Confirm</h2>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body pt-3">
          <p class="mb-0 text-soft" data-confirm-message></p>
        </div>
        <div class="modal-footer border-0 pt-0">
          <button type="button" class="btn btn-glass" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-danger" data-confirm-ok>Delete</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);
  modalInstance = new Modal(modalEl);

  modalEl.addEventListener('hidden.bs.modal', () => {
    if (resolvePromise) {
      resolvePromise(false);
      resolvePromise = null;
    }
  });

  modalEl.querySelector('[data-confirm-ok]').addEventListener('click', () => {
    if (resolvePromise) {
      const resolve = resolvePromise;
      resolvePromise = null;
      modalInstance.hide();
      resolve(true);
    }
  });

  return modalEl;
}

export function showConfirm({
  title = 'Confirm action',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  confirmClass = 'btn-danger',
} = {}) {
  const el = ensureModal();

  el.querySelector('[data-confirm-title]').textContent = title;
  el.querySelector('[data-confirm-message]').textContent = message;

  const okBtn = el.querySelector('[data-confirm-ok]');
  okBtn.textContent = confirmLabel;
  okBtn.className = `btn ${confirmClass}`;

  return new Promise((resolve) => {
    resolvePromise = resolve;
    modalInstance.show();
  });
}

export function showDeleteConfirm({ itemName, message } = {}) {
  const label = itemName ? `"${itemName}"` : 'this item';
  return showConfirm({
    title: 'Delete project?',
    message: message ?? `Are you sure you want to delete ${label}? This will remove all stages and tasks.`,
    confirmLabel: 'Delete',
    confirmClass: 'btn-danger',
  });
}
