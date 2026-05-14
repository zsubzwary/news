(function() {
  const SEARCH_KEY = 'news-search-index';
  let lunrIndex = null;
  let searchData = [];
  
  console.log('[Search] Script loaded');
  
  function getLanguage() {
    const path = window.location.pathname;
    const lang = path.includes('/ur/') ? 'ur' : 'en';
    console.log('[Search] Detected language:', lang, 'from path:', path);
    return lang;
  }
  
  async function loadSearchData() {
    console.log('[Search] loadSearchData() called');
    const lang = getLanguage();
    const cached = sessionStorage.getItem(SEARCH_KEY + '-' + lang);
    console.log('[Search] Cached data exists:', cached ? 'yes' : 'no');
    
    if (cached) {
      console.log('[Search] Loading from cache');
      const parsed = JSON.parse(cached);
      searchData = parsed.data;
      lunrIndex = lunr.Index.load(parsed.index);
      console.log('[Search] Cached data loaded, items count:', searchData.length);
      console.log('[Search] Sample cached item:', searchData[0]);
      return;
    }
    
    const dataUrl = document.querySelector('meta[name="search-data-url"]')?.content;
    console.log('[Search] Data URL from meta tag:', dataUrl);
    
    if (!dataUrl) {
      console.error('[Search] No data URL found - meta tag missing?');
      return;
    }
    
    try {
      console.log('[Search] Fetching from:', dataUrl);
      const response = await fetch(dataUrl);
      console.log('[Search] Fetch response status:', response.status);
      
      if (!response.ok) {
        console.error('[Search] Fetch failed with status:', response.status);
        return;
      }
      
      const text = await response.text();
      console.log('[Search] Raw response text (first 500 chars):', text.substring(0, 500));
      
      searchData = JSON.parse(text);
      console.log('[Search] Parsed JSON, items count:', searchData.length);
      console.log('[Search] First 3 items:', searchData.slice(0, 3));
      
      if (searchData.length === 0) {
        console.error('[Search] Search data is empty array!');
        return;
      }
      
      console.log('[Search] Building Lunr index...');
      lunrIndex = lunr(function() {
        this.ref('id');
        this.field('section', { boost: 10 });
        this.field('content');
        
        searchData.forEach(item => {
          console.log('[Search] Adding to index - id:', item.id, 'section:', item.section);
          this.add(item);
        });
      });
      console.log('[Search] Lunr index built successfully');
      
      sessionStorage.setItem(SEARCH_KEY + '-' + lang, JSON.stringify({
        data: searchData,
        index: lunrIndex.toJSON()
      }));
      console.log('[Search] Data cached to sessionStorage');
      
    } catch (err) {
      console.error('[Search] Failed to load search data:', err);
      console.error('[Search] Error stack:', err.stack);
    }
  }
  
  function search(query) {
    console.log('[Search] search() called with query:', query);
    console.log('[Search] lunrIndex exists:', lunrIndex ? 'yes' : 'no');
    console.log('[Search] searchData length:', searchData.length);
    
    if (!lunrIndex) {
      console.error('[Search] lunrIndex is null - data not loaded');
      return [];
    }
    
    if (!query.trim()) {
      console.log('[Search] Query is empty');
      return [];
    }
    
    try {
      console.log('[Search] Executing lunr.search...');
      const results = lunrIndex.search(query);
      console.log('[Search] Raw search results count:', results.length);
      console.log('[Search] Raw results:', results);
      
      const mappedResults = results.map(result => {
        const item = searchData.find(d => d.id === parseInt(result.ref));
        console.log('[Search] Mapping result ref:', result.ref, 'found item:', item);
        return {
          ...item,
          score: result.score
        };
      });
      
      console.log('[Search] Mapped results:', mappedResults);
      return mappedResults;
    } catch (err) {
      console.error('[Search] Search error:', err);
      console.error('[Search] Error stack:', err.stack);
      return [];
    }
  }
  
  function renderResults(results) {
    console.log('[Search] renderResults() called with', results.length, 'results');
    const container = document.getElementById('search-results');
    console.log('[Search] Results container element:', container);
    
    if (!container) {
      console.error('[Search] No results container found!');
      return;
    }
    
    if (results.length === 0) {
      console.log('[Search] No results - showing empty message');
      container.innerHTML = '<p class="search-empty">No results found</p>';
      container.style.display = 'block';
      return;
    }
    
    console.log('[Search] Rendering', Math.min(results.length, 10), 'items');
    
    const html = results.slice(0, 10).map((result, i) => {
      const displayText = (result.content || '')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*\[(.*?)\]\(.*?\)\*/g, '$1')
        .substring(0, 150);
      
      console.log('[Search] Item', i, '- section:', result.section, 'url:', result.url);
      
      return `
        <a href="${result.url}" class="search-result-item">
          <div class="search-result-section">${result.section}</div>
          <div class="search-result-title">${displayText}</div>
        </a>
      `;
    }).join('');
    
    console.log('[Search] Generated HTML length:', html.length);
    container.innerHTML = html;
    container.style.display = 'block';
    console.log('[Search] Results rendered and displayed');
  }
  
  function hideResults() {
    console.log('[Search] hideResults() called');
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
    console.log('[Search] init() called');
    const input = document.getElementById('search-input');
    const container = document.getElementById('search-results');
    
    console.log('[Search] Input element:', input);
    console.log('[Search] Container element:', container);
    
    if (!input) {
      console.error('[Search] No input element found!');
      return;
    }
    
    loadSearchData();
    
    const debouncedSearch = debounce((query) => {
      console.log('[Search] Debounced search triggered, query:', query);
      if (!query.trim()) {
        hideResults();
        return;
      }
      const results = search(query);
      renderResults(results);
    }, 200);
    
    input.addEventListener('input', (e) => {
      console.log('[Search] Input event, value:', e.target.value);
      debouncedSearch(e.target.value);
    });
    
    input.addEventListener('keydown', (e) => {
      console.log('[Search] Keydown event, key:', e.key, 'value:', input.value);
      
      if (e.key === 'Escape') {
        hideResults();
        input.blur();
      }
      
      if (e.key === 'Enter') {
        console.log('[Search] Enter pressed, triggering immediate search');
        const query = input.value;
        console.log('[Search] Query on Enter:', query);
        if (query.trim()) {
          const results = search(query);
          console.log('[Search] Search returned:', results.length, 'results');
          renderResults(results);
        }
      }
    });
    
    input.addEventListener('focus', (e) => {
      console.log('[Search] Focus event, value:', e.target.value);
      if (e.target.value.trim()) {
        debouncedSearch(e.target.value);
      }
    });
    
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        hideResults();
      }
    });
    
    console.log('[Search] All event listeners attached');
  }
  
  if (document.readyState === 'loading') {
    console.log('[Search] DOM loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', init);
  } else {
    console.log('[Search] DOM ready, calling init immediately');
    init();
  }
})();