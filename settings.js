// Add this line at the VERY TOP of your settings.js file
import('https://cdn.jsdelivr.net/npm/marked/marked.min.js');

document.addEventListener('DOMContentLoaded', () => {
    const classSelector = document.getElementById('classSelector');
    const rosterContainer = document.getElementById('rosterContainer');
    const notesToggle = document.getElementById('notesToggle');
    let allData = {};

    function findPreviousNotes(userId, currentClassName) {
        const previousNotes = [];
        const classNames = Object.keys(allData).filter(key => key !== 'lastSelectedClass' && key !== currentClassName);
        for (const className of classNames) {
            const roster = allData[className];
            const foundUser = roster.find(user => user.userId === userId);
            if (foundUser && foundUser.notes) {
                previousNotes.push({ className: className, note: foundUser.notes });
            }
        }
        return previousNotes;
    }

    function findOtherClasses(userId, currentClassName) {
        const otherClasses = [];
        const classNames = Object.keys(allData).filter(key => key !== 'lastSelectedClass' && key !== currentClassName);
        for (const className of classNames) {
            const roster = allData[className];
            if (roster.some(user => user.userId === userId)) {
                otherClasses.push(className);
            }
        }
        return otherClasses;
    }

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

            const otherClasses = findOtherClasses(user.userId, className);
            if (otherClasses.length > 0) {
                const historyContainer = document.createElement('div');
                historyContainer.className = 'class-history';
                historyContainer.innerHTML = `<h5>Also In:</h5><p>${otherClasses.join(', ')}</p>`;
                card.appendChild(historyContainer);
            }

            if (notesToggle.checked) {
                if (user.notes) {
                    const note = document.createElement('p');
                    note.className = 'user-note';
                    note.innerHTML = marked.parse(user.notes);
                    card.appendChild(note);
                }
                const previousNotes = findPreviousNotes(user.userId, className);
                if (previousNotes.length > 0) {
                    const previousNotesContainer = document.createElement('div');
                    previousNotesContainer.className = 'previous-notes';
                    const header = document.createElement('h5');
                    header.textContent = 'Previous Notes';
                    previousNotesContainer.appendChild(header);
                    previousNotes.forEach(prevNote => {
                        const noteEntry = document.createElement('p');
                        noteEntry.innerHTML = `<strong>${prevNote.className}:</strong> ${marked.parse(prevNote.note)}`;
                        previousNotesContainer.appendChild(noteEntry);
                    });
                    card.appendChild(previousNotesContainer);
                }
            }
            rosterContainer.appendChild(card);
        });
    }

    chrome.storage.local.get(null, (data) => {
        allData = data;
        const classNames = Object.keys(data).filter(key => key !== 'lastSelectedClass');
        classNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            classSelector.appendChild(option);
        });
        const lastClass = data.lastSelectedClass;
        if (lastClass && classNames.includes(lastClass)) {
            classSelector.value = lastClass;
            renderRoster(lastClass);
        }
    });
    
    classSelector.addEventListener('change', () => {
        const selectedClass = classSelector.value;
        renderRoster(selectedClass);
        if (selectedClass) {
            chrome.storage.local.set({ lastSelectedClass: selectedClass });
        }
    });
    notesToggle.addEventListener('change', () => renderRoster(classSelector.value));

    rosterContainer.addEventListener('mouseover', (event) => {
        if (notesToggle.checked) return;
        const card = event.target.closest('.user-card');
        if (!card || document.getElementById('note-tooltip')) return;
        const userId = card.dataset.userId;
        const className = classSelector.value;
        const student = allData[className]?.find(s => s.userId === userId);
        let noteText = student && student.notes ? student.notes : "No notes for this class.";
        const otherClasses = findOtherClasses(userId, className);
        if (otherClasses.length > 0) {
            noteText += `\n\n— Also In —\n${otherClasses.join(', ')}`;
        }
        const previousNotes = findPreviousNotes(userId, className);
        if (previousNotes.length > 0) {
            noteText += '\n\n— Previous Notes —';
            previousNotes.forEach(prevNote => {
                noteText += `\n${prevNote.className}: ${prevNote.note}`;
            });
        }
        const tooltip = document.createElement('div');
        tooltip.id = 'note-tooltip';
        tooltip.innerHTML = marked.parse(noteText);
        tooltip.style.cssText = `position: fixed; top: ${event.clientY + 15}px; left: ${event.clientX + 15}px; background-color: #282c34; color: #abb2bf; padding: 10px 15px; border-radius: 8px; z-index: 10000; font-size: 14px; max-width: 300px; line-height: 1.5; text-align: left; word-wrap: break-word; box-shadow: 0 4px 12px rgba(0,0,0,0.2);`;
        document.body.appendChild(tooltip);
    });

    rosterContainer.addEventListener('mouseout', () => {
        const tooltip = document.getElementById('note-tooltip');
        if (tooltip) tooltip.remove();
    });
});