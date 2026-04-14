// Global variables
let currentMessage = "";
let port;
let writer;
setTimeout(updateUserStudentDisplay, 100);
window.addEventListener('load', updateUserStudentDisplay);
window.addEventListener('storage', updateUserStudentDisplay);

// Toggle Login/Logout in nav
document.addEventListener('DOMContentLoaded', () => {
  const authLink = document.getElementById('authLink');
  if (authLink) {
    try {
      if (sessionStorage.getItem('jwc_session')) {
        authLink.innerText = 'Logout';
        authLink.href = '#';
        authLink.onclick = (e) => {
          e.preventDefault();
          sessionStorage.removeItem('jwc_session');
          location.href = 'index.html';
        };
      } else {
        authLink.innerText = 'Login';
        authLink.href = 'login.html';
      }
    } catch (e) {}
  }
});

// ========== WEB SERIAL ==========
async function connectArduino() {
  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 9600 });
  writer = port.writable.getWriter();
}

async function sendToArduino() {
  try {
    if (!port) await connectArduino();
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(currentMessage + "\n"));
    sessionStorage.removeItem('jwc_pending_message');
    const status = document.getElementById('status');
    if (status) status.innerText = "Message sent to drawbot successfully.";
  } catch (err) {
    const status = document.getElementById('status');
    if (status) status.innerText = "Connection failed. Make sure Arduino is plugged in and try again.";
  }
}

function goToConfirm() {
  const input = document.getElementById('messageInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  sessionStorage.setItem('jwc_pending_message', text);
  window.location.href = 'confirm.html';
}

// ========== STUDENTS PAGE ==========
if (document.getElementById('students')) {
  let students = JSON.parse(localStorage.getItem('jwc_students')) || [];
  let editingStudentId = null;
  let currentStudentId = localStorage.getItem('jwc_current_student_id');

  function initStudentsPage() {
    renderStudents();
    loadCurrentStudent();
    
    // Add student popup
    const addBtn = document.getElementById('addStudentBtn');
    if (addBtn) addBtn.addEventListener('click', showAddStudentPopup);
    
    const cancelBtn = document.getElementById('cancelBtn');
    const confirmBtn = document.getElementById('confirmBtn');
    const nameInput = document.getElementById('studentNameInput');
    
    if (cancelBtn) cancelBtn.addEventListener('click', hidePopup);
    if (confirmBtn) confirmBtn.addEventListener('click', handleConfirmStudent);
    if (nameInput) {
      nameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleConfirmStudent();
      });
    }
    
    // History popup handlers
    const historyCancelBtn = document.getElementById('historyCancelBtn');
    const loadHistoryBtn = document.getElementById('loadHistoryBtn');
    if (historyCancelBtn) historyCancelBtn.addEventListener('click', hideHistoryPopup);
    if (loadHistoryBtn) loadHistoryBtn.addEventListener('click', loadSelectedHistory);
    
    // Remove popup handlers
    const removeCancelBtn = document.getElementById('removeCancelBtn');
    const removeConfirmBtn = document.getElementById('removeConfirmBtn');
    if (removeCancelBtn) removeCancelBtn.addEventListener('click', hideRemovePopup);
    if (removeConfirmBtn) removeConfirmBtn.addEventListener('click', confirmRemoveStudent);
  }

  function renderStudents() {
    const container = document.getElementById('studentsList');
    if (!container) return;
    
    container.innerHTML = '';
    students.forEach((student, index) => {
      const isSelected = currentStudentId == student.id;
      const studentDiv = document.createElement('div');
      studentDiv.className = `student-item ${isSelected ? 'selected' : ''}`;
      studentDiv.onclick = () => selectStudent(student.id);
      studentDiv.innerHTML = `
        <div class="student-info">
          <div class="student-name">${student.name}</div>
          <div class="student-skill">Skill Level: ${student.skill || 'Not set'}</div>
          <div>Prompts: ${student.history ? student.history.length : 0}</div>
        </div>
        <div class="student-actions">
          <button class="history-btn" onclick="event.stopPropagation(); showHistory(${index})">History</button>
          <button class="edit-btn" onclick="event.stopPropagation(); editStudent(${index})">Edit</button>
          <button class="remove-btn" onclick="event.stopPropagation(); removeStudent(${index})">Remove</button>
        </div>
      `;
      container.appendChild(studentDiv);
    });
  }

  function selectStudent(studentId) {
    currentStudentId = studentId;
    localStorage.setItem('jwc_current_student_id', studentId);
    location.reload();
  }

  function clearCurrentStudent() {
    currentStudentId = null;
    localStorage.removeItem('jwc_current_student_id');
    const display = document.getElementById('currentStudentDisplay');
    if (display) display.style.display = 'none';
    renderStudents();
  }

  function loadCurrentStudent() {
    const display = document.getElementById('currentStudentDisplay');
    const nameSpan = document.getElementById('currentStudentName');
    if (!display || !nameSpan) return;
    
    if (currentStudentId) {
      const student = students.find(s => s.id == currentStudentId);
      if (student) {
        nameSpan.textContent = student.name;
        display.style.display = 'block';
        return;
      }
    }
    display.style.display = 'none';
  }

  // === ADD/EDIT STUDENT ===
  function showAddStudentPopup() {
    editingStudentId = null;
    document.getElementById('popupTitle').textContent = 'Add New Student';
    document.getElementById('studentNameInput').value = '';
    document.getElementById('studentPopup').style.display = 'flex';
    document.getElementById('studentNameInput').focus();
  }

  function editStudent(index) {
    editingStudentId = index;
    const student = students[index];
    document.getElementById('popupTitle').textContent = 'Edit Student Name';
    document.getElementById('studentNameInput').value = student.name;
    document.getElementById('studentPopup').style.display = 'flex';
    document.getElementById('studentNameInput').focus();
  }
  function saveStudents() {
    localStorage.setItem('jwc_students', JSON.stringify(students));
  }
  function handleConfirmStudent() {
    const nameInput = document.getElementById('studentNameInput');
    const name = nameInput.value.trim();
    if (!name) {
      alert('Please enter a student name');
      return;
    }

    if (editingStudentId !== null) {
      students[editingStudentId].name = name;
    } else {
      const newStudent = {
        id: Date.now(),
        name: name,
        skill: '',
        data: {},
        history: []
      };
      students.unshift(newStudent);
    }
    saveStudents();
    hidePopup();
    renderStudents();
    setTimeout(updateUserStudentDisplay, 100);
window.addEventListener('load', updateUserStudentDisplay);
window.addEventListener('storage', updateUserStudentDisplay);
  }

  function hidePopup() {
    document.getElementById('studentPopup').style.display = 'none';
  }

  // === HISTORY POPUP ===
  function showHistory(index) {
    const student = students[index];
    document.historyStudentIndex = index;
    
    if (!student.history || student.history.length === 0) {
      alert(`${student.name} has no writing history yet.`);
      return;
    }

    document.getElementById('historyTitle').textContent = `${student.name}'s Writing History`;
    renderHistoryList(student.history);
    document.getElementById('historyPopup').style.display = 'flex';
  }

  function renderHistoryList(history) {
    const container = document.getElementById('historyList');
    if (!container) return;
    
    container.innerHTML = '';
    history.slice(-20).reverse().forEach((prompt, i) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.onclick = () => selectHistoryItem(i, prompt);
      item.innerHTML = `
        <div>
          <div class="history-preview">${prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt}</div>
          <div class="history-date">${new Date().toLocaleDateString()}</div>
        </div>
        <div class="history-count">${i + 1}</div>
      `;
      container.appendChild(item);
    });
    
    document.getElementById('loadHistoryBtn').style.display = 'none';
  }

  function selectHistoryItem(historyIndex, prompt) {
    document.querySelectorAll('.history-item').forEach(item => {
      item.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    document.selectedHistoryPrompt = prompt;
    document.getElementById('loadHistoryBtn').style.display = 'inline-block';
  }

  function loadSelectedHistory() {
    if (document.selectedHistoryPrompt) {
      sessionStorage.setItem('jwc_pending_message', document.selectedHistoryPrompt);
      hideHistoryPopup();
      window.location.href = 'write.html';
    }
  }

  function hideHistoryPopup() {
    document.getElementById('historyPopup').style.display = 'none';
  }

  // === REMOVE STUDENT ===
  function removeStudent(index) {
    const student = students[index];
    document.removeStudentIndex = index;
    const nameEl = document.getElementById('removeStudentName');
    if (nameEl) nameEl.textContent = `Remove ${student.name}?`;
    document.getElementById('removePopup').style.display = 'flex';
  }

  function confirmRemoveStudent() {
    const index = document.removeStudentIndex;
    students.splice(index, 1);
    if (!students.find(s => s.id == currentStudentId)) {
      clearCurrentStudent();
    }
    saveStudents();
    hideRemovePopup();
    renderStudents();
  }
  updateUserStudentDisplay();

  // Listen for storage changes (if user switches tabs)
  window.addEventListener('storage', updateUserStudentDisplay);
};
  function hideRemovePopup() {
    document.getElementById('removePopup').style.display = 'none';
  }
  function updateUserStudentDisplay() {
  try {
    const session = sessionStorage.getItem('jwc_session');
    const currentStudentId = localStorage.getItem('jwc_current_student_id');
    const students = JSON.parse(localStorage.getItem('jwc_students')) || [];
    
    let displayText = '';
    
    if (session) {
      // Extract username from session (assuming it's stored as JSON)
      let username = 'User';
      try {
        const sessionData = JSON.parse(session);
        username = sessionData.username || 'User';
      } catch (e) {
        username = session || 'User';
      }
      
      displayText = username;
      
      // Add current student if selected
      if (currentStudentId) {
        const student = students.find(s => s.id == currentStudentId);
        if (student) {
          displayText += `: ${student.name}`;
        } else {
          // Clear invalid student selection
          localStorage.removeItem('jwc_current_student_id');
        }
      }
    }
    document.querySelectorAll('.user-student-display').forEach(el => {
      el.textContent = displayText;
    });
  } catch (e) {
    console.error('Error updating user/student display:', e);
  }

  // Initialize students page
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStudentsPage);
  } else {
    initStudentsPage();
  }

  // Global functions for onclick handlers
  window.selectStudent = selectStudent;
  window.clearCurrentStudent = clearCurrentStudent;
  window.editStudent = editStudent;
  window.removeStudent = removeStudent;
  window.showHistory = showHistory;
}