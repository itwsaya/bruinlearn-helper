// A helper function to wait for an element to exist before running a callback.
function waitForElement(selector, callback) {
    const observer = new MutationObserver((mutations, me) => {
        const element = document.querySelector(selector);
        if (element) {
            me.disconnect();
            callback();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// =========================================================================
//  SECTION 1: CORE FUNCTIONS
// =========================================================================

function processNode(node) {
  // This function remains the same, it just adds LinkedIn buttons.
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const studentRows = node.querySelectorAll('.al-hover-container.StudentEnrollment:not(.linkedin-button-added)');
  for (const row of studentRows) {
    row.classList.add('linkedin-button-added');
    const nameElement = row.querySelector('.roster_user_name.student_context_card_trigger');
    if (!nameElement) continue;
    const studentName = nameElement.textContent.trim();
    if (!studentName) continue;
    const cleanedName = studentName.replace(/\s*\([^)]*\)\s*/g, '').trim();
    if (!cleanedName) continue;
    const nameParts = cleanedName.split(',').map(part => part.trim());
    let searchQuery;
    if (nameParts.length >= 2) {
      const lastName = nameParts[0];
      const firstName = nameParts[1];
      searchQuery = `"${firstName}" "${lastName}" ucla site:linkedin.com`;
    } else {
      searchQuery = `"${cleanedName}" ucla site:linkedin.com`;
    }
    const searchLink = document.createElement('a');
    searchLink.href = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    searchLink.target = '_blank';
    searchLink.rel = 'noopener noreferrer';
    searchLink.textContent = 'Find on LinkedIn';
    searchLink.setAttribute('aria-label', `Search for ${studentName} on LinkedIn`);
    searchLink.classList.add('btn', 'Button', 'Button--secondary');
    searchLink.style.padding = '4px 8px';
    searchLink.style.fontSize = '0.8rem';
    const lastCell = row.querySelector('td.right');
    if (lastCell) {
      lastCell.appendChild(searchLink);
    } else {
      const cells = row.querySelectorAll('td');
      if (cells.length > 0) {
        cells[cells.length - 1].appendChild(searchLink);
      }
    }
  }
}

/**
 * --- UPDATED ---
 * Parses a single user row, now including an empty 'notes' field.
 */
function parseUserRow(row) {
    const user = {};
    user.userId = row.id.replace('user_', '');
    const pfpElement = row.querySelector('.center img');
    user.pfpUrl = pfpElement ? pfpElement.src : '';
    const nameElement = row.querySelector('.roster_user_name');
    const fullNameText = nameElement ? nameElement.textContent.trim() : 'Unknown, Name';
    const pronounMatch = fullNameText.match(/\(([^)]+)\)/);
    user.pronouns = pronounMatch ? pronounMatch[1] : '';
    const cleanedName = fullNameText.replace(/\s*\([^)]*\)\s*/g, '').trim();
    const nameParts = cleanedName.split(',').map(part => part.trim());
    user.lastName = nameParts[0] || '';
    user.firstName = nameParts[1] || '';
    const roleElement = row.querySelector('td:nth-of-type(3) div');
    user.role = roleElement ? roleElement.textContent.trim() : '';
    user.notes = ""; // --- NEW: Initialize notes field for every user.
    return user;
}

async function scrapeAndSaveRoster() {
    // This function remains the same.
    console.log("--- Starting Roster Scrape ---");
    const classNameElement = document.querySelector('#breadcrumbs li:nth-of-type(2) .ellipsible');
    const className = classNameElement ? classNameElement.textContent.trim() : 'Unknown-Class';
    if (className === 'My Dashboard' || className === 'Unknown-Class') {
        alert("Error: Could not find a class name. Please navigate to a course's 'People' page before saving.");
        return;
    }
    const userRows = document.querySelectorAll('tr.rosterUser');
    if (userRows.length === 0) return;
    const rosterData = Array.from(userRows).map(parseUserRow);
    try {
        const existingData = await chrome.storage.local.get(null);
        existingData[className] = rosterData;
        await chrome.storage.local.set(existingData);
        alert(`Success! Saved roster for "${className}" with ${rosterData.length} members.`);
    } catch (error) {
        console.error("❌ FAILED: Error saving to storage:", error);
    }
}

function addScrapeButton() {
    // This function remains the same.
    const rosterContainer = document.querySelector('div[data-view="users"]');
    if (rosterContainer && !document.getElementById('scrapeRosterBtn')) {
        const scrapeButton = document.createElement('button');
        scrapeButton.id = 'scrapeRosterBtn';
        scrapeButton.textContent = 'Save Roster';
        scrapeButton.className = 'btn Button Button--primary';
        scrapeButton.style.marginBottom = '15px';
        scrapeButton.onclick = scrapeAndSaveRoster;
        rosterContainer.prepend(scrapeButton);
    }
}

/**
 * --- NEW ---
 * This function adds all the right-click and hover functionality for notes.
 */
function addNoteFunctionality() {
    const studentNameLinks = document.querySelectorAll('.roster_user_name:not(.notes-added)');
    
    studentNameLinks.forEach(link => {
        link.classList.add('notes-added');

        // --- HOVER TO VIEW NOTE ---
        link.addEventListener('mouseenter', async (event) => {
            const row = event.target.closest('tr.rosterUser');
            if (!row) return;
            
            const userId = row.id.replace('user_', '');
            const className = document.querySelector('#breadcrumbs li:nth-of-type(2) .ellipsible').textContent.trim();
            
            const data = await chrome.storage.local.get(className);
            if (!data[className]) return;

            const student = data[className].find(s => s.userId === userId);
            const noteText = student && student.notes ? student.notes : "No notes yet. Right-click to add one!";

            // Create and show a tooltip
            const tooltip = document.createElement('div');
            tooltip.id = 'note-tooltip';
            tooltip.textContent = noteText;
            tooltip.style.cssText = `
                position: fixed; top: ${event.clientY + 15}px; left: ${event.clientX + 15}px;
                background-color: #333; color: white; padding: 8px 12px; border-radius: 6px;
                z-index: 10000; font-size: 14px; max-width: 300px;
            `;
            document.body.appendChild(tooltip);
        });
        
        link.addEventListener('mouseleave', () => {
            const tooltip = document.getElementById('note-tooltip');
            if (tooltip) tooltip.remove();
        });

        // --- RIGHT-CLICK TO ADD/EDIT NOTE ---
        link.addEventListener('contextmenu', async (event) => {
            event.preventDefault(); // Stop the default right-click menu
            
            const row = event.target.closest('tr.rosterUser');
            if (!row) return;

            const userId = row.id.replace('user_', '');
            const className = document.querySelector('#breadcrumbs li:nth-of-type(2) .ellipsible').textContent.trim();
            
            const data = await chrome.storage.local.get(className);
            // Check if the roster has been saved first
            if (!data[className]) {
                alert("Please save the roster before adding notes to students.");
                return;
            }

            const studentIndex = data[className].findIndex(s => s.userId === userId);
            if (studentIndex === -1) return;

            const currentNote = data[className][studentIndex].notes || "";
            // Using a simple prompt() for the popup. A custom HTML file is possible but more complex.
            const newNote = prompt(`Enter note for ${event.target.textContent.trim()}:`, currentNote);

            if (newNote !== null) { // User clicked OK, not Cancel
                data[className][studentIndex].notes = newNote;
                await chrome.storage.local.set({ [className]: data[className] });
                alert("Note saved!");
            }
        });
    });
}

// =========================================================================
//  SECTION 2: INITIALIZATION LOGIC
// =========================================================================

// in content.js

// This is the main function that runs everything once the roster table is ready.
function initialize() {
    console.log("BruinLearn Helper: Roster table found! Initializing script...");
    addScrapeButton();
    processNode(document.body);

    const rosterTable = document.querySelector('table.roster');
    if (!rosterTable) return;

    // --- Event Delegation for Right-Click (No changes here) ---
    rosterTable.addEventListener('contextmenu', async (event) => {
        const targetLink = event.target.closest('.roster_user_name');
        if (!targetLink) return;

        event.preventDefault();

        const row = targetLink.closest('tr.rosterUser');
        const userId = row.id.replace('user_', '');
        const className = document.querySelector('#breadcrumbs li:nth-of-type(2) .ellipsible').textContent.trim();
        
        const data = await chrome.storage.local.get(className);
        if (!data[className]) {
            alert("Please save the roster before adding notes to students.");
            return;
        }

        const studentIndex = data[className].findIndex(s => s.userId === userId);
        if (studentIndex === -1) return;

        const currentNote = data[className][studentIndex].notes || "";
        const newNote = prompt(`Enter note for ${targetLink.textContent.trim()}:`, currentNote);

        if (newNote !== null) {
            data[className][studentIndex].notes = newNote;
            await chrome.storage.local.set({ [className]: data[className] });
            alert("Note saved!");
        }
    });

    // --- UPDATED: Event Delegation for Hover Tooltip ---
    rosterTable.addEventListener('mouseover', async (event) => {
        const targetLink = event.target.closest('.roster_user_name');
        if (!targetLink || document.getElementById('note-tooltip')) return;

        const row = targetLink.closest('tr.rosterUser');
        const userId = row.id.replace('user_', '');
        const className = document.querySelector('#breadcrumbs li:nth-of-type(2) .ellipsible').textContent.trim();
        
        const data = await chrome.storage.local.get(className);
        if (!data[className]) return;

        const student = data[className].find(s => s.userId === userId);
        const noteText = student && student.notes ? student.notes : "No notes yet.";

        const tooltip = document.createElement('div');
        tooltip.id = 'note-tooltip';
        tooltip.textContent = noteText;

        // ** THE FIX IS HERE: Updated styles for better readability **
        tooltip.style.cssText = `
            position: fixed; 
            top: ${event.clientY + 15}px; 
            left: ${event.clientX + 15}px;
            background-color: #282c34; 
            color: #abb2bf; 
            padding: 10px 15px; 
            border-radius: 8px;
            z-index: 10000; 
            font-size: 14px; 
            max-width: 300px;
            /* --- NEW STYLES --- */
            line-height: 1.5;
            text-align: left;
            word-wrap: break-word;
            white-space: pre-wrap;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(tooltip);
    });

    rosterTable.addEventListener('mouseout', (event) => {
        const targetLink = event.target.closest('.roster_user_name');
        if (!targetLink) return;
        const tooltip = document.getElementById('note-tooltip');
        if (tooltip) tooltip.remove();
    });

    // --- MutationObserver for scroll (No changes here) ---
    const observer = new MutationObserver((mutationsList) => {
        let shouldReprocess = false;
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                shouldReprocess = true;
                break;
            }
        }
        if (shouldReprocess) {
            setTimeout(() => { processNode(document.body); }, 100);
        }
    });

    const targetNode = document.getElementById('content') || document.body;
    const config = { childList: true, subtree: true };
    observer.observe(targetNode, config);
}

// --- SCRIPT EXECUTION STARTS HERE ---
waitForElement('table.roster', initialize);