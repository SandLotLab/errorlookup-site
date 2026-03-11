(() => {
  const root = document.documentElement;
  const saved = localStorage.getItem('el-theme');
  if (saved !== 'light') root.classList.add('dark');

  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'theme-toggle') {
      root.classList.toggle('dark');
      localStorage.setItem('el-theme', root.classList.contains('dark') ? 'dark' : 'light');
    }
  });
})();
