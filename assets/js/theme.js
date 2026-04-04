(function() {
  const themeToggle = document.getElementById('theme-toggle');
  const STORAGE_KEY = 'news-briefing-theme';
  
  const THEMES = {
    light: '☀️',
    dark: '🌙'
  };
  
  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  function getStoredTheme() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored || 'auto';
  }
  
  function getEffectiveTheme() {
    const stored = getStoredTheme();
    return stored === 'auto' ? getSystemTheme() : stored;
  }
  
  function applyTheme(theme) {
    const effectiveTheme = theme === 'auto' ? getSystemTheme() : theme;
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    if (themeToggle) {
      themeToggle.textContent = THEMES[effectiveTheme];
    }
  }
  
  function rotateTheme() {
    const currentTheme = getStoredTheme();
    const effectiveTheme = getEffectiveTheme();
    
    let nextTheme;
    if (currentTheme === 'auto') {
      nextTheme = effectiveTheme === 'light' ? 'dark' : 'light';
    } else {
      nextTheme = 'auto';
    }
    
    localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }
  
  function init() {
    const storedTheme = getStoredTheme();
    applyTheme(storedTheme);
    
    if (themeToggle) {
      themeToggle.addEventListener('click', rotateTheme);
    }
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const stored = getStoredTheme();
      if (stored === 'auto') {
        applyTheme('auto');
      }
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
