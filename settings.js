document.addEventListener('DOMContentLoaded', () => {
    const classSelector = document.getElementById('classSelector');
    const rosterContainer = document.getElementById('rosterContainer');
    const notesToggle = document.getElementById('notesToggle');
    let allData = {};

    function renderRoster(className) {
        rosterContainer.innerHTML = '';
        const roster = allData[className];
        if (!roster) return;

        roster.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.dataset.userId = user.userId;
            
            const pfp = document.createElement('img');
            pfp.src = user.pfpUrl;
            pfp.alt = `${user.firstName} ${user.lastName}`;
            
            const name = document.createElement('div');
            name.className = 'user-name';
            name.textContent = `${user.firstName} ${user.lastName} ${user.pronouns}`;
            
            const role = document.createElement('div');
            role.className = 'user-role';
            role.textContent = user.role;
            
            card.appendChild(pfp);
            card.appendChild(name);
            card.appendChild(role);

            if (notesToggle.checked && user.notes) {
                const note = document.createElement('p');
                note.className = 'user-note';
                note.textContent = user.notes;
                card.appendChild(note);
            }

            rosterContainer.appendChild(card);
        });
    }

    // Load all data from storage, including the last selected class
    chrome.storage.local.get(null, (data) => {
        allData = data;
        // Exclude our new 'lastSelectedClass' key from the list of classes
        const classNames = Object.keys(data).filter(key => key !== 'lastSelectedClass');
        
        classNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            classSelector.appendChild(option);
        });

        // --- NEW: Check for a previously saved selection ---
        const lastClass = data.lastSelectedClass;
        // If a last-used class exists and it's in our list of saved rosters...
        if (lastClass && classNames.includes(lastClass)) {
            // ...then select it in the dropdown and render it.
            classSelector.value = lastClass;
            renderRoster(lastClass);
        }
    });
    
    // --- UPDATED: Save the last selection when the user chooses a class ---
    classSelector.addEventListener('change', () => {
        const selectedClass = classSelector.value;
        renderRoster(selectedClass);
        
        // --- NEW: Save the current selection to storage ---
        if (selectedClass) {
            chrome.storage.local.set({ lastSelectedClass: selectedClass });
        }
    });
    
    rosterContainer.addEventListener('mouseover', (event) => {
        if (notesToggle.checked) return;
        const card = event.target.closest('.user-card');
        if (!card || document.getElementById('note-tooltip')) return;
        const userId = card.dataset.userId;
        const className = classSelector.value;
        const student = allData[className]?.find(s => s.userId === userId);
        const noteText = student && student.notes ? student.notes : "No notes yet.";
        const tooltip = document.createElement('div');
        tooltip.id = 'note-tooltip';
        tooltip.textContent = noteText;
        tooltip.style.cssText = `position: fixed; top: ${event.clientY + 15}px; left: ${event.clientX + 15}px; background-color: #282c34; color: #abb2bf; padding: 10px 15px; border-radius: 8px; z-index: 10000; font-size: 14px; max-width: 300px; line-height: 1.5; text-align: left; word-wrap: break-word; white-space: pre-wrap; box-shadow: 0 4px 12px rgba(0,0,0,0.2);`;
        document.body.appendChild(tooltip);
    });

    rosterContainer.addEventListener('mouseout', () => {
        const tooltip = document.getElementById('note-tooltip');
        if (tooltip) tooltip.remove();
    });
    
    notesToggle.addEventListener('change', () => renderRoster(classSelector.value));
});