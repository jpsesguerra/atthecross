/* Nav — mobile toggle + active link */

(function () {
  const toggle = document.querySelector('.navToggle');
  const menu = document.querySelector('.navMenu');

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('isOpen');
      toggle.setAttribute('aria-expanded', isOpen);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.siteNav')) {
        menu.classList.remove('isOpen');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Mark active nav link based on current page
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navLink, .navLinkGive').forEach((link) => {
    const href = link.getAttribute('href').split('/').pop();
    if (href === currentPath) {
      link.setAttribute('aria-current', 'page');
    }
  });
})();
