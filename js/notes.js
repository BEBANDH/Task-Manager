import { state, persistNotes } from './state.js';
import { uid, now } from './storage.js';
import { copyToClipboard } from './utils.js';

let editingNoteId = null;

export function isNotesLocked() {
    return !!state.notesLocked;
}

export function toggleNotesLock() {
    state.notesLocked = !state.notesLocked;
    persistNotes();
    applyNotesLockUI();
    renderNotes();
}

export function applyNotesLockUI() {
    const locked = isNotesLocked();
    const lockIcon = document.getElementById('lockNotesIcon');
    const lockText = document.getElementById('lockNotesText');
    const lockBtn = document.getElementById('lockNotesBtn');
    const titleInput = document.getElementById('noteTitleInput');
    const bodyInput = document.getElementById('noteBodyInput');
    const noteForm = document.getElementById('noteForm');
    const addBtn = noteForm ? noteForm.querySelector('button[type="submit"]') : null;

    if (lockIcon) {
        lockIcon.innerHTML = locked
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>';
    }
    if (lockText) lockText.textContent = locked ? 'Locked' : 'Unlocked';
    if (lockBtn) lockBtn.title = locked ? 'Unlock Notes' : 'Lock Notes';
    if (titleInput) {
        titleInput.disabled = locked;
        titleInput.placeholder = locked ? 'Notes are locked...' : 'Title / 題名...';
    }
    if (bodyInput) {
        bodyInput.disabled = locked;
        bodyInput.placeholder = locked ? 'Notes are locked...' : 'Take a note / 本文...';
    }
    if (addBtn) addBtn.disabled = locked;
}

export async function shareNotes() {
    const sortedNotes = [...state.notes].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    const payload = {
        folderName: 'Notes',
        notes: sortedNotes.map(n => ({
            title: n.title || '',
            body: n.body || '',
            color: n.color || '',
            createdAt: n.createdAt || 0
        })),
        sharedAt: Date.now()
    };

    const compactPayload = {
        n: 'Notes',
        t: payload.notes.map(n => ({
            t: n.title,
            b: n.body,
            c: n.color,
            d: n.createdAt
        }))
    };

    const buildEncodedUrl = (data) => {
        const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
        return `${window.location.origin}${window.location.pathname}?noteshare=${encoded}`;
    };

    try {
        let shareUrl = '';
        if (window.firebaseDb && window.firebaseDb.db) {
            const { db, doc, setDoc } = window.firebaseDb;
            const shareId = uid();
            await setDoc(doc(db, 'shared_notes', shareId), payload);
            shareUrl = `${window.location.origin}${window.location.pathname}?notes=${shareId}`;
        } else {
            shareUrl = buildEncodedUrl(compactPayload);
        }

        const copied = await copyToClipboard(shareUrl);
        if (copied) {
            alert(`Read-only notes link copied to clipboard!\n\n${shareUrl}`);
        } else {
            prompt('Copy your read-only notes share link below:', shareUrl);
        }
    } catch (err) {
        console.error('Error creating notes share link:', err);
        try {
            const shareUrl = buildEncodedUrl(compactPayload);
            const copied = await copyToClipboard(shareUrl);
            if (copied) {
                alert(`Read-only notes link copied to clipboard!\n\n${shareUrl}`);
            } else {
                prompt('Copy your read-only notes share link below:', shareUrl);
            }
        } catch (fallbackErr) {
            alert(`Failed to generate share link: ${fallbackErr.message || err.message}`);
        }
    }
}

export function initNotes() {
    const noteForm = document.getElementById('noteForm');
    if (noteForm) {
        noteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (isNotesLocked()) return;
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

    const lockBtn = document.getElementById('lockNotesBtn');
    if (lockBtn) {
        lockBtn.addEventListener('click', () => toggleNotesLock());
    }

    const shareBtn = document.getElementById('shareNotesBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => shareNotes());
    }

    applyNotesLockUI();
}

export function addNote(title, body) {
    if (isNotesLocked()) return;
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
    if (isNotesLocked()) return;
    state.notes = state.notes.filter(n => n.id !== id);
    persistNotes();
    renderNotes();
}

const NOTE_ACCENT_COLORS = {
    vermilion: '#e8453c',
    yamabuki: '#ffaa00',
    matcha: '#48b870',
    ai: '#38a4ff',
    sakura: '#ff5c98',
    fuji: '#b86bff',
    sumi: '#f5f5f5'
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
    titleInput.readOnly = isNotesLocked();
    bodyInput.readOnly = isNotesLocked();
    
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
    
    if (!isNotesLocked() && !note.body) {
        bodyInput.focus();
    }
}

function renderNoteColorPicker(note) {
    const container = document.getElementById('noteColorPicker');
    if (!container) return;
    container.innerHTML = '';
    if (isNotesLocked()) return;
    
    Object.keys(NOTE_ACCENT_COLORS).forEach(colorKey => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'note-color-btn' + (note.color === colorKey ? ' active' : '');
        btn.style.backgroundColor = NOTE_ACCENT_COLORS[colorKey];
        btn.title = colorKey.charAt(0).toUpperCase() + colorKey.slice(1);
        btn.setAttribute('aria-label', `Set note color to ${colorKey}`);
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isNotesLocked()) return;
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
    if (note && !isNotesLocked()) {
        const titleInput = document.getElementById('noteEditTitle');
        const bodyInput = document.getElementById('noteEditBody');
        
        note.title = titleInput.value.trim();
        note.body = bodyInput.value.trim();
        
        if (!note.title && !note.body) {
            deleteNote(note.id);
        } else {
            persistNotes();
        }
    }
    
    editingNoteId = null;
    const modal = document.getElementById('noteEditModal');
    if (modal) {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            delete modalContent.dataset.noteColor;
        }
        modal.setAttribute('hidden', '');
    }
    renderNotes();
}

export function renderNotes(searchQuery = '') {
    applyNotesLockUI();
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
    
    li.addEventListener('click', (e) => {
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
        let firstLine = note.body.split('\n')[0];
        if (firstLine.length > 150) {
            firstLine = firstLine.substring(0, 150) + '...';
        }
        bodyPreview = `<div class="note-body-preview">${escapeHTML(firstLine)}</div>`;
    }

    const deleteHtml = isNotesLocked() ? '' : `
            <button class="icon-button delete-note-btn" aria-label="Delete Note" title="Delete Note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>`;

    li.innerHTML = `
        ${titleHtml}
        ${bodyPreview}
        <div class="note-meta">
            <span class="note-date">${dateString}</span>
            ${deleteHtml}
        </div>
    `;

    const delBtn = li.querySelector('.delete-note-btn');
    if (delBtn) {
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isNotesLocked()) return;
            if (confirm('Delete this note?')) {
                deleteNote(note.id);
            }
        });
    }

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
