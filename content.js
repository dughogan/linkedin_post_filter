// content.js

const LOCATION_PATTERNS = {
    US: {
      allowed: ['united states', 'usa', 'us', 'u.s.', 'u.s.a.', 'american'],
      filter: [
        'canada', 'canadian', 'vancouver', 'toronto', 'montreal', 'calgary', 'ottawa',
        'british columbia', 'ontario', 'quebec', 'alberta', 'manitoba',
        'uk', 'united kingdom', 'london', 'manchester', 'birmingham', 'leeds', 'glasgow',
        'england', 'scotland', 'wales', 'northern ireland', 'british',
        'australia', 'australian', 'sydney', 'melbourne',
        'new zealand', 'wellington', 'auckland',
        'european union', 'eu', 'europe'
      ]
    },
    CA: {
      allowed: ['canada', 'canadian'],
      filter: ['united states', 'usa', 'us', 'uk', 'united kingdom', 'australia', 'new zealand', 'european union']
    },
    UK: {
      allowed: ['uk', 'united kingdom', 'england', 'scotland', 'wales', 'northern ireland', 'british'],
      filter: ['canada', 'united states', 'usa', 'australia', 'new zealand', 'european union']
    },
    AU: {
      allowed: ['australia', 'australian'],
      filter: ['canada', 'united states', 'usa', 'uk', 'united kingdom', 'new zealand', 'european union']
    },
    NZ: {
      allowed: ['new zealand', 'nz'],
      filter: ['canada', 'united states', 'usa', 'uk', 'united kingdom', 'australia', 'european union']
    },
    EU: {
      allowed: ['european union', 'eu', 'europe'],
      filter: ['canada', 'united states', 'usa', 'uk', 'united kingdom', 'australia', 'new zealand']
    }
  };
  
  // Default settings
  let userCountry = 'US';
  let showRemote = true;
  
  // Load saved settings from Chrome storage
  chrome.storage.sync.get(['country', 'showRemote'], (result) => {
    if (result.country) userCountry = result.country;
    if (result.showRemote !== undefined) showRemote = result.showRemote;
  });
  
  class ProgressiveLoader {
    constructor() {
      this.processedPosts = new Set();
      this.isProcessing = false;
      this.queue = [];
      this.batchSize = 5;
      this.processingDelay = 100;
      
      this.viewportObserver = new IntersectionObserver(
        (entries) => this.handleIntersection(entries),
        {
          root: null,
          rootMargin: '100px 0px',
          threshold: 0.1
        }
      );
    }
  
    addToQueue(post) {
      if (this.processedPosts.has(post)) return;
      
      this.queue.push(post);
      this.processedPosts.add(post);
      
      if (!this.isProcessing) {
        this.processBatch();
      }
    }
  
    async processBatch() {
      if (this.queue.length === 0) {
        this.isProcessing = false;
        return;
      }
  
      this.isProcessing = true;
      const batch = this.queue.splice(0, this.batchSize);
  
      batch.forEach(post => {
        if (isJobPost(post)) {
          const text = post.textContent.toLowerCase();
          if (!isJobAllowedForUser(text)) {
            filterPost(post, userCountry);
          }
        }
      });
  
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.processingDelay));
        requestAnimationFrame(() => this.processBatch());
      } else {
        this.isProcessing = false;
      }
    }
  
    handleIntersection(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.addToQueue(entry.target);
          this.viewportObserver.unobserve(entry.target);
        }
      });
    }
  
    observePost(post) {
      if (!this.processedPosts.has(post)) {
        this.viewportObserver.observe(post);
      }
    }
  }
  
  function isJobPost(post) {
    const text = post.textContent.toLowerCase();
    const jobIndicators = [
      'we\'re hiring', 'is hiring', 'job opening', 'open position',
      'new role', 'join our team', 'apply now', 'view job',
      'job opportunity', 'position available', 'submit your application',
      'apply here', 'job description', 'compensation:', 'responsibilities:',
      'qualifications:', 'requirements:', 'full-time', 'part-time', 'hybrid',
      'apply by', 'position summary', 'career opportunity'
    ];
  
    return jobIndicators.some(indicator => text.includes(indicator));
  }
  
  function isJobAllowedForUser(text) {
    const patterns = LOCATION_PATTERNS[userCountry];
    const textLower = text.toLowerCase();
    
    // Common location requirement phrases
    const locationPhrases = [
      'based in',
      'located in',
      'position in',
      'role in',
      'working in',
      'work in',
      'position is in',
      'job is in',
      'based out of',
      'relocate to',
      'must be in',
      'must live in',
      'must reside in',
      'position is based',
      'role is based',
      'job based',
      'work from',
      'working from'
    ];
  
    // Check for phrases like "based in Europe" etc.
    for (const phrase of locationPhrases) {
      const index = textLower.indexOf(phrase);
      if (index !== -1) {
        // Look at the next few words after the phrase
        const followingText = textLower.slice(index + phrase.length, index + phrase.length + 50);
        if (patterns.filter.some(location => followingText.includes(location.toLowerCase()))) {
          return false;
        }
      }
    }
    
    // Check for remote work allowances
    if (showRemote && textLower.includes('remote')) {
      const isAllowed = patterns.allowed.some(location => 
        textLower.includes(`remote from ${location}`) || 
        textLower.includes(`${location} remote`) ||
        textLower.includes(`remote ${location}`) ||
        textLower.includes(`remote work from ${location}`) ||
        textLower.includes(`remote position in ${location}`) ||
        textLower.includes(`${location}-based remote`)
      );
      if (isAllowed) return true;
    }
  
    // Check for general location restrictions
    return !patterns.filter.some(location => {
      const restrictivePatterns = [
        `\\b${location}\\b`,
        `${location} only`,
        `${location}( |-)based`,
        `in ${location}`,
        `from ${location}`,
        `within ${location}`,
        `${location} region`,
        `${location} area`,
        `${location} location`,
        `position in ${location}`,
        `in ${location}`,        
        `remote within ${location}`,
        `role in ${location}`,
        `located in ${location}`,
        `working in ${location}`,
        `based in ${location}`,    
        `work in ${location}`,
        `based in ${location}`,
        `located in ${location}`,
        `relocate to ${location}`,
        `must be in ${location}`,
        `must live in ${location}`,
        `must reside in ${location}`,
        `${location} office`,
        `${location} timezone`,
        `${location} working hours`,
        `authorized to work in ${location}`,
        `right to work in ${location}`,
        `valid work permit in ${location}`,
        `${location} work authorization`
      ];
      const combinedPattern = new RegExp(restrictivePatterns.join('|'), 'i');
      return combinedPattern.test(text);
    });
  }
  
  function filterPost(postContainer, location) {
    if (postContainer.hasAttribute('data-filtered')) return;
  
    // Find the actual content areas to blur
    const contentAreas = [
        // Main post content
        ...postContainer.querySelectorAll('.feed-shared-update-v2__description-wrapper'),
        ...postContainer.querySelectorAll('.feed-shared-article__description-container'),
        ...postContainer.querySelectorAll('.feed-shared-text'),
        ...postContainer.querySelectorAll('.feed-shared-update-v2__content'),
        ...postContainer.querySelectorAll('.feed-shared-mini-update-v2__description'),
        ...postContainer.querySelectorAll('.feed-shared-article'),
        // Job post specific content
        ...postContainer.querySelectorAll('.feed-shared-actor__description'),
        ...postContainer.querySelectorAll('.feed-shared-actor__title'),
        ...postContainer.querySelectorAll('.feed-shared-actor__sub-description'),
        ...postContainer.querySelectorAll('.feed-shared-text-view'),
        // Job details
        ...postContainer.querySelectorAll('.jobs-unified-top-card__content--two-pane'),
        ...postContainer.querySelectorAll('.jobs-unified-top-card__primary-description'),
        ...postContainer.querySelectorAll('.jobs-unified-top-card__job-title'),
        ...postContainer.querySelectorAll('.jobs-unified-top-card__subtitle-primary'),
        ...postContainer.querySelectorAll('.jobs-unified-top-card__description'),
        // Extra content areas
        ...postContainer.querySelectorAll('.update-components-text'),
        ...postContainer.querySelectorAll('.update-components-actor__meta'),
        ...postContainer.querySelectorAll('.update-components-actor__primary-text')
    ].filter(el => el && !el.closest('.feed-shared-actor__name')); // Exclude the name header
  
    // Create our warning banner first
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      background: #ff595e;
      color: white;
      padding: 8px;
      text-align: center;
      z-index: 2;
      font-size: 14px;
      transition: all 0.3s ease-in-out;
      pointer-events: auto;
    `;
    banner.textContent = `Position not available in ${LOCATION_PATTERNS[location].allowed[0]} - Click to show`;
    banner.setAttribute('data-filter-banner', 'true');
  
    // Set up the container
    postContainer.style.position = 'relative';
    postContainer.setAttribute('data-filtered', 'true');
  
    // Add banner at the top
    postContainer.insertBefore(banner, postContainer.firstChild);
  
    // Create and apply overlays to each content area
    const overlays = contentAreas.map(contentArea => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        transition: all 0.3s ease-in-out;
        z-index: 1;
        pointer-events: none;
      `;
      overlay.setAttribute('data-content-overlay', 'true');
      
      // Set relative positioning on content area if needed
      if (getComputedStyle(contentArea).position === 'static') {
        contentArea.style.position = 'relative';
      }
      
      contentArea.appendChild(overlay);
      return overlay;
    });
  
    // Handle hover effects
    const handleEnter = () => {
      if (postContainer.hasAttribute('data-filtered')) {
        overlays.forEach(overlay => {
          overlay.style.backdropFilter = 'blur(2px)';
          overlay.style.webkitBackdropFilter = 'blur(2px)';
          overlay.style.background = 'rgba(255, 255, 255, 0.5)';
        });
      }
    };
  
    const handleLeave = () => {
      if (postContainer.hasAttribute('data-filtered')) {
        overlays.forEach(overlay => {
          overlay.style.backdropFilter = 'blur(4px)';
          overlay.style.webkitBackdropFilter = 'blur(4px)';
          overlay.style.background = 'rgba(255, 255, 255, 0.8)';
        });
      }
    };
  
    postContainer.addEventListener('mouseenter', handleEnter);
    postContainer.addEventListener('mouseleave', handleLeave);
  
    // Handle click to show
    banner.addEventListener('click', (e) => {
      e.stopPropagation();
      
      requestAnimationFrame(() => {
        overlays.forEach(overlay => {
          overlay.style.opacity = '0';
        });
        banner.style.transform = 'translateY(-100%)';
        banner.style.opacity = '0';
        
        setTimeout(() => {
          overlays.forEach(overlay => overlay.remove());
          banner.remove();
          contentAreas.forEach(area => {
            area.style.position = '';
          });
          postContainer.style.position = '';
          postContainer.removeEventListener('mouseenter', handleEnter);
          postContainer.removeEventListener('mouseleave', handleLeave);
          postContainer.setAttribute('data-user-cleared', 'true');
        }, 300);
      });
    });
  }
  
  const POST_SELECTORS = [
    '.feed-shared-update-v2',
    '.jobs-job-card',
    '.job-card-container',
    '.jobs-search-results__list-item',
    '.update-components-actor',
    '.feed-shared-article'
  ].join(',');
  
  // Listen for settings changes from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'settingsUpdated') {
      userCountry = message.settings.country;
      showRemote = message.settings.showRemote;
      reprocessPosts();
    }
  });
  
  function reprocessPosts() {
    document.querySelectorAll('[data-filtered]').forEach(post => {
      // Remove all overlays
      post.querySelectorAll('[data-content-overlay]').forEach(overlay => overlay.remove());
      
      // Remove the banner
      const banner = post.querySelector('[data-filter-banner]');
      if (banner) banner.remove();
  
    // Reset all content area styles
    [
      '.feed-shared-update-v2__description-wrapper',
      '.feed-shared-article__description-container',
      '.feed-shared-text',
      '.feed-shared-update-v2__content',
      '.feed-shared-mini-update-v2__description',
      '.feed-shared-article',
      '.feed-shared-actor__description',
      '.feed-shared-actor__title',
      '.feed-shared-actor__sub-description',
      '.feed-shared-text-view',
      '.jobs-unified-top-card__content--two-pane',
      '.jobs-unified-top-card__primary-description',
      '.jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__subtitle-primary',
      '.jobs-unified-top-card__description',
      '.update-components-text',
      '.update-components-actor__meta',
      '.update-components-actor__primary-text'
    ].forEach(selector => {
        post.querySelectorAll(selector).forEach(area => {
          area.style.position = '';
        });
      });
  
      // Reset post container styles
      post.style.position = '';
      post.removeAttribute('data-filtered');
      post.removeAttribute('data-user-cleared');
    });
  
    // Reprocess with new settings
    document.querySelectorAll(POST_SELECTORS).forEach(post => {
      if (isJobPost(post)) {
        const text = post.textContent.toLowerCase();
        if (!isJobAllowedForUser(text)) {
          filterPost(post, userCountry);
        }
      }
    });
  }
  
  // Initialize loader
  const loader = new ProgressiveLoader();
  
  // Setup mutation observer
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.matches?.(POST_SELECTORS)) {
            loader.observePost(node);
          }
          node.querySelectorAll?.(POST_SELECTORS)?.forEach(post => {
            loader.observePost(post);
          });
        }
      });
    });
  });
  
  // Initialize extension
  function initialize() {
    document.querySelectorAll(POST_SELECTORS).forEach(post => {
      loader.observePost(post);
    });
  
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        document.querySelectorAll(`${POST_SELECTORS}:not([data-filtered])`).forEach(post => {
          if (!loader.processedPosts.has(post)) {
            loader.observePost(post);
          }
        });
      }, 150);
    }, { passive: true });
  }
  
  // Start when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }