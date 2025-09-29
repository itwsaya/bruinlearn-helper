document.addEventListener('DOMContentLoaded', async () => {
    const studentNameEl = document.getElementById('studentName');
    const noteEditor = document.getElementById('noteEditor');
    const saveBtn = document.getElementById('saveBtn');

    // Get student info from the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const className = urlParams.get('className');
    const userId = urlParams.get('userId');

    let studentIndex = -1;
    let rosterData = null;

    // Load the existing note
    if (className) {
        const data = await chrome.storage.local.get(className);
        rosterData = data[className];
        if (rosterData) {
            studentIndex = rosterData.findIndex(s => s.userId === userId);
            if (studentIndex !== -1) {
                const student = rosterData[studentIndex];
                studentNameEl.textContent = `Editing Note for ${student.firstName} ${student.lastName}`;
                noteEditor.value = student.notes || '';
            }
        }
    }
    
    // Save the note and close the tab when the button is clicked
    saveBtn.addEventListener('click', async () => {
        if (studentIndex !== -1 && rosterData) {
            rosterData[studentIndex].notes = noteEditor.value;
            await chrome.storage.local.set({ [className]: rosterData });
            // Close the current tab
            window.close();
        }
    });
});