document.documentElement.classList.add('js');

try {
  const savedTheme = localStorage.getItem('snapstat-theme');
  document.documentElement.dataset.theme = savedTheme ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
} catch {
  document.documentElement.dataset.theme = 'light';
}
