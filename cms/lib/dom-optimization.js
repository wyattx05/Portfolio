/**
 * DOM Optimization utilities
 * Reduces reflows and improves rendering performance
 */

/**
 * Build HTML efficiently using DocumentFragment
 * @param {HTMLElement} container - Target container
 * @param {string} html - HTML content
 */
function efficientSetInnerHTML(container, html) {
  const fragment = document.createDocumentFragment();
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  while (temp.firstChild) {
    fragment.appendChild(temp.firstChild);
  }
  
  container.textContent = '';
  container.appendChild(fragment);
}

/**
 * Batch DOM updates to minimize reflows
 * @param {Function} callback - Function containing DOM updates
 */
function batchDOMUpdates(callback) {
  requestAnimationFrame(() => {
    callback();
  });
}

/**
 * Limit array to N most recent items (sorted descending by date)
 * @param {Array} items - Items to filter
 * @param {number} limit - Maximum items to return
 * @param {string} dateField - Field name containing date
 * @returns {Array} Limited items, newest first
 */
function getMostRecentItems(items, limit = 3, dateField = 'date') {
  if (!Array.isArray(items)) return [];
  
  return items
    .sort((a, b) => new Date(b[dateField]) - new Date(a[dateField]))
    .slice(0, limit);
}

/**
 * Check if an element is in viewport
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} Whether element is visible
 */
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Export for use in CommonJS or scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    efficientSetInnerHTML,
    batchDOMUpdates,
    getMostRecentItems,
    isInViewport,
  };
}
