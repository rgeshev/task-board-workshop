let navigateImpl = null;

export function registerNavigator(fn) {
  navigateImpl = fn;
}

export function go(path, options) {
  if (navigateImpl) {
    navigateImpl(path, options);
  }
}
