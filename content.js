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

// --- processNode, parseUserRow, scrapeAndSaveRoster, addScrapeButton are unchanged ---
function processNode(node) {
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
    user.notes = "";
    return user;
}
async function scrapeAndSaveRoster() {
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
    } catch (error) { console.error("Error saving to storage:", error); }
}
function addScrapeButton() {
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
 * --- NEW: Functions to create, show, and handle the note editor modal ---
 */
function showNoteEditorModal(className, userId, studentName, currentNote) {
    // Remove any existing modal first
    const existingModal = document.getElementById('note-editor-modal');
    if (existingModal) existingModal.remove();

    // Create the modal background
    const backdrop = document.createElement('div');
    backdrop.id = 'note-editor-modal';
    backdrop.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;`;

    // Create the modal content area
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `background-color: white; padding: 20px; border-radius: 8px; width: 500px; max-width: 90%; box-shadow: 0 5px 15px rgba(0,0,0,0.3);`;
    
    // Add content to the modal
    modalContent.innerHTML = `
        <h3 style="margin-top: 0;">Editing Note for ${studentName}</h3>
        <textarea id="note-textarea" style="width: 100%; height: 200px; box-sizing: border-box; font-size: 1em; padding: 8px;">${currentNote}</textarea>
        <div style="margin-top: 15px; text-align: right;">
            <button id="note-cancel-btn" class="btn">Cancel</button>
            <button id="note-save-btn" class="btn Button--primary">Save</button>
        </div>
    `;

    backdrop.appendChild(modalContent);
    document.body.appendChild(backdrop);
    
    // --- Add logic to the buttons ---
    document.getElementById('note-save-btn').addEventListener('click', async () => {
        const newNote = document.getElementById('note-textarea').value;
        const data = await chrome.storage.local.get(className);
        if (data[className]) {
            const studentIndex = data[className].findIndex(s => s.userId === userId);
            if (studentIndex !== -1) {
                data[className][studentIndex].notes = newNote;
                await chrome.storage.local.set({ [className]: data[className] });
                alert('Note saved!');
                backdrop.remove(); // Close the modal
            }
        }
    });

    document.getElementById('note-cancel-btn').addEventListener('click', () => {
        backdrop.remove();
    });
}

// =========================================================================
//  SECTION 2: INITIALIZATION LOGIC
// =========================================================================

function initialize() {
    console.log("BruinLearn Helper: Roster table found! Initializing script...");
    addScrapeButton();
    processNode(document.body);

    const rosterTable = document.querySelector('table.roster');
    if (!rosterTable) return;

    // --- UPDATED: Right-click now opens the modal dialog ---
    rosterTable.addEventListener('contextmenu', async (event) => {
        const targetLink = event.target.closest('.roster_user_name');
        if (!targetLink) return;
        event.preventDefault();

        const row = targetLink.closest('tr.rosterUser');
        const userId = row.id.replace('user_', '');
        const className = document.querySelector('#breadcrumbs li:nth-of-type(2) .ellipsible').textContent.trim();
        const studentName = targetLink.textContent.trim();
        
        const data = await chrome.storage.local.get(className);
        if (!data[className]) {
            alert("Please save the roster before adding notes.");
            return;
        }

        const student = data[className].find(s => s.userId === userId);
        const currentNote = student ? student.notes : "";
        
        showNoteEditorModal(className, userId, studentName, currentNote);
    });

    // --- Hover and Observer logic remains the same ---
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
        const noteHtml = marked.parse(noteText);
        const tooltip = document.createElement('div');
        tooltip.id = 'note-tooltip';
        tooltip.innerHTML = noteHtml;
        tooltip.style.cssText = `position: fixed; top: ${event.clientY + 15}px; left: ${event.clientX + 15}px; background-color: #282c34; color: #abb2bf; padding: 10px 15px; border-radius: 8px; z-index: 10000; font-size: 14px; max-width: 300px; line-height: 1.5; text-align: left; word-wrap: break-word; box-shadow: 0 4px 12px rgba(0,0,0,0.2);`;
        document.body.appendChild(tooltip);
    });
    rosterTable.addEventListener('mouseout', (event) => {
        const tooltip = document.getElementById('note-tooltip');
        if (tooltip) tooltip.remove();
    });
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