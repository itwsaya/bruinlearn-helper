/**
 * Processes a given DOM node to find and add LinkedIn buttons to any student rows within it.
 * @param {Node} node - The DOM node to search within.
 */
function processNode(node) {
  // Ensure the node is an element that can contain other elements.
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const studentRows = node.querySelectorAll(
    '.al-hover-container.StudentEnrollment:not(.linkedin-button-added)'
  );

  for (const row of studentRows) {
    row.classList.add('linkedin-button-added');

    const nameElement = row.querySelector('.roster_user_name.student_context_card_trigger');
    if (!nameElement) continue;

    const studentName = nameElement.textContent.trim();
    if (!studentName) continue;

    // Remove pronouns in parentheses (e.g., "(he/him)", "(she/her)", etc.)
    const cleanedName = studentName.replace(/\s*\([^)]*\)\s*/g, '').trim();
    if (!cleanedName) continue;

    // Split the name into parts and format for LinkedIn search
    const nameParts = cleanedName.split(',').map(part => part.trim());
    let searchQuery;
    
    if (nameParts.length >= 2) {
      // Format: "last name" "first name" ucla site:linkedin.com
      const lastName = nameParts[0];
      const firstName = nameParts[1];
      searchQuery = `"${firstName}" "${lastName}" ucla site:linkedin.com`;
    } else {
      // Fallback for single name or unexpected format
      searchQuery = `"${cleanedName}" ucla site:linkedin.com`;
    }

    const searchLink = document.createElement('a');
    searchLink.href = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    searchLink.target = '_blank';
    searchLink.rel = 'noopener noreferrer';
    searchLink.textContent = 'Find on LinkedIn';
    searchLink.setAttribute('aria-label', `Search for ${studentName} on LinkedIn`);

    // Apply styling.
    searchLink.classList.add('btn', 'Button', 'Button--secondary');
    searchLink.style.padding = '4px 8px';
    searchLink.style.fontSize = '0.8rem';

    // Find the last cell (right-aligned cell) and append the button there
    const lastCell = row.querySelector('td.right');
    if (lastCell) {
      lastCell.appendChild(searchLink);
    } else {
      // Fallback: find the last td cell if no .right cell exists
      const cells = row.querySelectorAll('td');
      if (cells.length > 0) {
        cells[cells.length - 1].appendChild(searchLink);
      }
    }
  }
}

// Initial run to process elements already on the page.
processNode(document.body);

// Set up a MutationObserver to watch for dynamically added content.
const observer = new MutationObserver((mutationsList) => {
  let shouldReprocess = false;
  
  for (const mutation of mutationsList) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      shouldReprocess = true;
      break;
    }
  }
  
  // If any nodes were added, reprocess the entire target container
  // This ensures we catch student rows that may be built incrementally
  if (shouldReprocess) {
    // Small delay to ensure DOM has finished updating
    setTimeout(() => {
      const targetNode = document.getElementById('content') || document.body;
      processNode(targetNode);
    }, 100);
  }
});

// Start observing the main content area of the page for changes.
// The '#content' selector is a common ID for the main content wrapper in Canvas.
// This should be verified with the inspector.
const targetNode = document.getElementById('content') || document.body;
const config = { childList: true, subtree: true };
observer.observe(targetNode, config);