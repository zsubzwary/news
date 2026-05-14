(function() {
  const SEARCH_KEY = 'news-search-index';
  let lunrIndex = null;
  let searchData = [];
  let currentQuery = '';
  let activeResultIndex = -1;
  
  function getLanguage() {
    const path = window.location.pathname;
    return path.includes('/ur/') ? 'ur' : 'en';
  }
  
  function getPlaceholder() {
    return getLanguage() === 'ur' ? 'تلاش کرن...' : 'Search news...';
  }
  
  async function loadSearchData() {
    const lang = getLanguage();
    const cached = sessionStorage.getItem(SEARCH_KEY + '-' + lang);
    
    if (cached) {
      const parsed = JSON.parse(cached);
      searchData = parsed.data;
      lunrIndex = lunr.Index.load(parsed.index);
      return true;
    }
    
    const dataUrl = document.querySelector('meta[name="search-data-url"]')?.content;
    if (!dataUrl) return false;
    
    showLoading();
    
    try {
      const response = await fetch(dataUrl);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      
      searchData = await response.json();
      
      if (searchData.length === 0) {
        hideLoading();
        return false;
      }
      
      lunrIndex = lunr(function() {
        this.ref('id');
        this.field('section', { boost: 10 });
        this.field('content');
        this.pipeline.remove(lunr.stopWordFilter);
        
        searchData.forEach(item => {
          this.add(item);
        });
      });
      
      sessionStorage.setItem(SEARCH_KEY + '-' + lang, JSON.stringify({
        data: searchData,
        index: lunrIndex.toJSON()
      }));
      
      hideLoading();
      return true;
    } catch (err) {
      console.error('Search load error:', err);
      hideLoading();
      return false;
    }
  }
  
  function showLoading() {
    const loading = document.getElementById('search-loading');
    const content = document.getElementById('search-content');
    if (loading) loading.classList.add('visible');
    if (content) content.classList.remove('visible');
  }
  
  function hideLoading() {
    const loading = document.getElementById('search-loading');
    if (loading) loading.classList.remove('visible');
  }
  
  function highlightText(text, query) {
    if (!query || !text) return text;
    const terms = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 1);
    let highlighted = text;
    terms.forEach(term => {
      const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });
    return highlighted;
  }
  
  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  function search(query) {
    if (!lunrIndex || !query.trim()) return [];
    
    currentQuery = query;
    
    try {
      let results = lunrIndex.search(query);
      
      if (results.length === 0) {
        const terms = query.trim().split(/\s+/);
        const wildcardQuery = terms.map(t => t + '*').join(' ');
        results = lunrIndex.search(wildcardQuery);
      }
      
      if (results.length === 0) {
        const terms = query.trim().split(/\s+/);
        const fuzzyQuery = terms.map(t => t + '~1').join(' ');
        results = lunrIndex.search(fuzzyQuery);
      }
      
      return results.map(result => {
        const item = searchData.find(d => d.id === parseInt(result.ref));
        return { ...item, score: result.score };
      });
    } catch (err) {
      console.error('Search error:', err);
      return [];
    }
  }
  
  function renderResults(results) {
    const container = document.getElementById('search-results');
    const content = document.getElementById('search-content');
    
    if (!container || !content) return;
    
    activeResultIndex = -1;
    
    if (results.length === 0) {
      const lang = getLanguage();
      const emptyMsg = lang === 'ur' ? 'کوئی نتیجہ نہیں ملا' : 'No results found';
      const emptyIcon = '🔍';
      
      content.innerHTML = `
        <div class="search-empty">
          <span class="search-empty-icon">${emptyIcon}</span>
          <span>${emptyMsg}</span>
        </div>
      `;
      content.classList.add('visible');
      container.classList.add('visible');
      return;
    }
    
    const lang = getLanguage();
    const resultsText = lang === 'ur' ? 'نتائج' : 'results';
    const resultText = lang === 'ur' ? 'نتیجہ' : 'result';
    const countLabel = results.length === 1 ? resultText : resultsText;
    
    const headerHtml = results.length > 0 ? `
      <div class="search-results-header">
        <span>${results.length} ${countLabel}</span>
        <span class="search-count">${results.length > 10 ? '10+' : results.length}</span>
      </div>
    ` : '';
    
    const html = results.slice(0, 10).map((result, i) => {
      const displayText = highlightText(
        (result.content || '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*\[(.*?)\]\(.*?\)\*/g, '$1').substring(0, 150),
        currentQuery
      );
      
      return `
        <a href="${result.url}" class="search-result-item" data-index="${i}">
          <div class="search-result-section">${result.section}</div>
          <div class="search-result-title">${displayText}</div>
        </a>
      `;
    }).join('');
    
    content.innerHTML = headerHtml + html;
    content.classList.add('visible');
    container.classList.add('visible');
  }
  
  function hideResults() {
    const container = document.getElementById('search-results');
    const content = document.getElementById('search-content');
    if (container) container.classList.remove('visible');
    if (content) content.classList.remove('visible');
    activeResultIndex = -1;
  }
  
  function clearSearch() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear');
    if (input) {
      input.value = '';
      input.focus();
    }
    if (clearBtn) clearBtn.classList.remove('visible');
    hideResults();
  }
  
  function updateActiveResult(direction) {
    const items = document.querySelectorAll('.search-result-item');
    if (items.length === 0) return;
    
    if (activeResultIndex >= 0) {
      items[activeResultIndex].classList.remove('active');
    }
    
    if (direction === 'next') {
      activeResultIndex = (activeResultIndex + 1) % items.length;
    } else if (direction === 'prev') {
      activeResultIndex = activeResultIndex <= 0 ? items.length - 1 : activeResultIndex - 1;
    }
    
    items[activeResultIndex].classList.add('active');
    items[activeResultIndex].scrollIntoView({ block: 'nearest' });
  }
  
  function selectActiveResult() {
    const items = document.querySelectorAll('.search-result-item');
    if (activeResultIndex >= 0 && items[activeResultIndex]) {
      items[activeResultIndex].click();
    } else if (items.length > 0) {
      items[0].click();
    }
  }
  
  function updateClearButton() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear');
    if (input && clearBtn) {
      if (input.value.length > 0) {
        clearBtn.classList.add('visible');
      } else {
        clearBtn.classList.remove('visible');
      }
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
    const clearBtn = document.getElementById('search-clear');
    
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
      updateClearButton();
      debouncedSearch(e.target.value);
    });
    
    input.addEventListener('keydown', (e) => {
      const resultsVisible = document.getElementById('search-results')?.classList.contains('visible');
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!resultsVisible && input.value.trim()) {
            const results = search(input.value);
            renderResults(results);
          }
          updateActiveResult('next');
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (resultsVisible) {
            updateActiveResult('prev');
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (resultsVisible) {
            selectActiveResult();
          } else if (input.value.trim()) {
            const results = search(input.value);
            renderResults(results);
            if (results.length > 0) {
              updateActiveResult('next');
            }
          }
          break;
        case 'Escape':
          hideResults();
          input.blur();
          break;
      }
    });
    
    input.addEventListener('focus', (e) => {
      if (e.target.value.trim()) {
        const results = search(e.target.value);
        if (results.length > 0) {
          renderResults(results);
        }
      }
    });
    
    if (clearBtn) {
      clearBtn.addEventListener('click', clearSearch);
    }
    
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        hideResults();
      }
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();