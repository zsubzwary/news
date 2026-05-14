(function() {
  const SEARCH_KEY = 'news-search-index';
  let lunrIndex = null;
  let searchData = [];
  
  function getLanguage() {
    const path = window.location.pathname;
    if (path.includes('/ur/')) return 'ur';
    return 'en';
  }
  
  async function loadSearchData() {
    const lang = getLanguage();
    const cached = sessionStorage.getItem(SEARCH_KEY + '-' + lang);
    
    if (cached) {
      const parsed = JSON.parse(cached);
      searchData = parsed.data;
      lunrIndex = lunr.Index.load(parsed.index);
      return;
    }
    
    const dataUrl = document.querySelector('meta[name="search-data-url"]')?.content;
    if (!dataUrl) return;
    
    try {
      const response = await fetch(dataUrl);
      searchData = await response.json();
      
      lunrIndex = lunr(function() {
        this.ref('id');
        this.field('title', { boost: 10 });
        this.field('section', { boost: 5 });
        this.field('content');
        
        searchData.forEach(item => {
          this.add(item);
        });
      });
      
      sessionStorage.setItem(SEARCH_KEY + '-' + lang, JSON.stringify({
        data: searchData,
        index: lunrIndex.toJSON()
      }));
    } catch (err) {
      console.error('Failed to load search data:', err);
    }
  }
  
  function search(query) {
    if (!lunrIndex || !query.trim()) return [];
    
    try {
      const results = lunrIndex.search(query);
      return results.map(result => {
        const item = searchData.find(d => d.id === parseInt(result.ref));
        return {
          ...item,
          score: result.score
        };
      });
    } catch (err) {
      console.error('Search error:', err);
      return [];
    }
  }
  
  function renderResults(results) {
    const container = document.getElementById('search-results');
    if (!container) return;
    
    if (results.length === 0) {
      container.innerHTML = '<p class="search-empty">No results found</p>';
      container.style.display = 'block';
      return;
    }
    
    const html = results.slice(0, 10).map(result => {
      const escapedTitle = result.title
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*\[(.*?)\]\((.*?)\)\*/g, '');
      
      return `
        <a href="${result.url}" class="search-result-item">
          <div class="search-result-section">${result.section}</div>
          <div class="search-result-title">${escapedTitle}</div>
        </a>
      `;
    }).join('');
    
    container.innerHTML = html;
    container.style.display = 'block';
  }
  
  function hideResults() {
    const container = document.getElementById('search-results');
    if (container) {
      container.style.display = 'none';
      container.innerHTML = '';
    }
  }
  
  function debounce(fn, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }
  
  function init() {
    const input = document.getElementById('search-input');
    const container = document.getElementById('search-results');
    
    if (!input) return;
    
    loadSearchData();
    
    const debouncedSearch = debounce((query) => {
      if (!query.trim()) {
        hideResults();
        return;
      }
      const results = search(query);
      renderResults(results);
    }, 200);
    
    input.addEventListener('input', (e) => {
      debouncedSearch(e.target.value);
    });
    
    input.addEventListener('focus', (e) => {
      if (e.target.value.trim()) {
        debouncedSearch(e.target.value);
      }
    });
    
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        hideResults();
      }
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideResults();
        input.blur();
      }
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();