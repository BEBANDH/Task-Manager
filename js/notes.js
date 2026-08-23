import { state, persistNotes, triggerCloudSync } from './state.js';
import { uid, now } from './storage.js';

let editingNoteId = null;

export function initNotes() {
    const noteForm = document.getElementById('noteForm');
    if (noteForm) {
        noteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const titleInput = document.getElementById('noteTitleInput');
            const bodyInput = document.getElementById('noteBodyInput');
            
            if (titleInput && bodyInput) {
                const titleVal = titleInput.value.trim();
                const bodyVal = bodyInput.value.trim();
                
                if (titleVal || bodyVal) {
                    addNote(titleVal, bodyVal);
                    titleInput.value = '';
                    bodyInput.value = '';
                }
            }
        });
        
        // Submit form on Enter key in textarea (without shift)
        const noteBodyInput = document.getElementById('noteBodyInput');
        if (noteBodyInput) {
            noteBodyInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    noteForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
            });
        }
    }

    const noteEditModal = document.getElementById('noteEditModal');
    const noteEditClose = document.getElementById('noteEditClose');
    
    if (noteEditClose) {
        noteEditClose.addEventListener('click', closeNoteModal);
    }
    
    // Close modal when clicking outside
    if (noteEditModal) {
        noteEditModal.addEventListener('click', (e) => {
            if (e.target === noteEditModal) {
                closeNoteModal();
            }
        });
    }

    const searchInput = document.getElementById('notesSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderNotes(e.target.value);
        });
    }
}

export function addNote(title, body) {
    const newNote = {
        id: uid(),
        title: title,
        body: body || '',
        createdAt: now(),
        locked: false
    };
    state.notes.push(newNote);
    persistNotes();
    renderNotes();
}

export function deleteNote(id) {
    state.notes = state.notes.filter(n => n.id !== id);
    persistNotes();
    renderNotes();
}

const NOTE_ACCENT_COLORS = {
    mustard: '#E1AD01',
    brown: '#C19A6B',
    sky: '#8FBCD3',
    sage: '#A9C4A6',
    rose: '#D88C9A',
    mauve: '#B39EB5',
    black: '#18181b'
};

export function openNoteModal(id) {
    const note = state.notes.find(n => n.id === id);
    if (!note) return;
    
    editingNoteId = id;
    const modal = document.getElementById('noteEditModal');
    const titleInput = document.getElementById('noteEditTitle');
    const bodyInput = document.getElementById('noteEditBody');
    const modalContent = modal.querySelector('.modal-content');
    
    titleInput.value = note.title || '';
    bodyInput.value = note.body || '';
    
    if (modalContent) {
        if (note.color) {
            modalContent.dataset.noteColor = note.color;
        } else {
            delete modalContent.dataset.noteColor;
        }
    }
    
    const dateEl = document.getElementById('noteEditDate');
    if (dateEl && note.createdAt) {
        const date = new Date(note.createdAt);
        const dateString = 'Created ' + date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        dateEl.textContent = dateString;
    }
    
    renderNoteColorPicker(note);
    modal.removeAttribute('hidden');
    
    // Auto focus based on content
    if (!note.body) {
        bodyInput.focus();
    }
}

function renderNoteColorPicker(note) {
    const container = document.getElementById('noteColorPicker');
    if (!container) return;
    container.innerHTML = '';
    
    Object.keys(NOTE_ACCENT_COLORS).forEach(colorKey => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'note-color-btn' + (note.color === colorKey ? ' active' : '');
        btn.style.backgroundColor = NOTE_ACCENT_COLORS[colorKey];
        btn.title = colorKey.charAt(0).toUpperCase() + colorKey.slice(1);
        btn.setAttribute('aria-label', `Set note color to ${colorKey}`);
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            note.color = note.color === colorKey ? '' : colorKey;
            persistNotes();
            
            const modalContent = document.querySelector('#noteEditModal .modal-content');
            if (modalContent) {
                if (note.color) {
                    modalContent.dataset.noteColor = note.color;
                } else {
                    delete modalContent.dataset.noteColor;
                }
            }
            renderNoteColorPicker(note);
            renderNotes();
        });
        
        container.appendChild(btn);
    });
}

function closeNoteModal() {
    if (!editingNoteId) return;
    
    const note = state.notes.find(n => n.id === editingNoteId);
    if (note) {
        const titleInput = document.getElementById('noteEditTitle');
        const bodyInput = document.getElementById('noteEditBody');
        
        note.title = titleInput.value.trim();
        note.body = bodyInput.value.trim();
        
        // Delete if entirely empty
        if (!note.title && !note.body) {
            deleteNote(note.id);
        } else {
            persistNotes();
        }
    }
    
    editingNoteId = null;
    const modal = document.getElementById('noteEditModal');
    modal.setAttribute('hidden', '');
    renderNotes();
}

export function renderNotes(searchQuery = '') {
    const container = document.getElementById('notesContainer');
    const emptyState = document.getElementById('emptyNotesState');
    if (!container) return;

    let displayNotes = [...state.notes];
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        displayNotes = displayNotes.filter(n => 
            (n.title && n.title.toLowerCase().includes(q)) || 
            (n.body && n.body.toLowerCase().includes(q))
        );
    }
    
    // Sort newest first
    displayNotes.sort((a, b) => b.createdAt - a.createdAt);

    container.innerHTML = '';
    
    if (displayNotes.length === 0) {
        container.style.display = 'none';
        if (emptyState) emptyState.removeAttribute('hidden');
    } else {
        container.style.display = '';
        if (emptyState) emptyState.setAttribute('hidden', '');
        
        displayNotes.forEach(note => {
            const el = renderNoteCard(note);
            container.appendChild(el);
        });
    }
}

function renderNoteCard(note) {
    const li = document.createElement('div');
    li.className = 'note-card';
    li.dataset.id = note.id;
    if (note.color) {
        li.dataset.noteColor = note.color;
    }
    
    // We open the modal when clicking anywhere on the card
    li.addEventListener('click', (e) => {
        // Prevent opening if clicking on delete button
        if (e.target.closest('.delete-note-btn')) return;
        openNoteModal(note.id);
    });

    const date = new Date(note.createdAt);
    const dateString = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let titleHtml = '';
    if (note.title) {
        titleHtml = `<div class="note-title">${escapeHTML(note.title)}</div>`;
    }
    
    let bodyPreview = '';
    if (note.body) {
        // Show first line as preview
        let firstLine = note.body.split('\n')[0];
        if (firstLine.length > 150) {
            firstLine = firstLine.substring(0, 150) + '...';
        }
        bodyPreview = `<div class="note-body-preview">${escapeHTML(firstLine)}</div>`;
    }

    li.innerHTML = `
        ${titleHtml}
        ${bodyPreview}
        <div class="note-meta">
            <span class="note-date">${dateString}</span>
            <button class="icon-button delete-note-btn" aria-label="Delete Note" title="Delete Note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    `;

    const delBtn = li.querySelector('.delete-note-btn');
    delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this note?')) {
            deleteNote(note.id);
        }
    });

    return li;
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
