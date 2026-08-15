import { state } from './state.js';
import { switchFolder } from './folders.js';

export function toggleCategoryCollapse(categoryName) {
  if (state.collapsedCategories.has(categoryName)) {
    state.collapsedCategories.delete(categoryName);
  } else {
    state.collapsedCategories.add(categoryName);
  }
  renderCategoriesView();
}

export function expandAllCategories() {
  state.collapsedCategories.clear();
  renderCategoriesView();
}

export function collapseAllCategories() {
  const categories = Array.from(new Set(state.folders.flatMap(f => f.labels || ['General'])));
  categories.forEach(c => state.collapsedCategories.add(c));
  renderCategoriesView();
}

export function renderCategoriesView() {
  const container = document.getElementById('categoriesContainer');
  if (!container) return;
  container.innerHTML = '';

  if (state.folders.length === 0) {
    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.hidden = false;
    return;
  }

  // Group folders by category/label
  const categoriesMap = {};
  state.folders.forEach(folder => {
    const labels = (folder.labels && folder.labels.length > 0) ? folder.labels : ['General'];
    labels.forEach(catName => {
      const trimmedCatName = catName.trim() || 'General';
      if (!categoriesMap[trimmedCatName]) {
        categoriesMap[trimmedCatName] = [];
      }
      categoriesMap[trimmedCatName].push(folder);
    });
  });

  const categoryNames = Object.keys(categoriesMap).sort((a, b) => {
    if (a === 'General') return 1;
    if (b === 'General') return -1;
    return a.localeCompare(b);
  });

  categoryNames.forEach(catName => {
    const folders = categoriesMap[catName];
    const isCategoryCollapsed = state.collapsedCategories.has(catName);

    let totalCategoryTasks = 0;
    let completedCategoryTasks = 0;

    folders.forEach(folder => {
      const listTasks = state.tasksByFolder[folder.id] || [];
      totalCategoryTasks += listTasks.length;
      completedCategoryTasks += listTasks.filter(t => t.completed).length;
    });

    const card = document.createElement('div');
    card.className = `category-card${isCategoryCollapsed ? ' collapsed' : ''}`;

    // Category Header (Accordion trigger)
    const header = document.createElement('div');
    header.className = 'category-header';
    header.addEventListener('click', () => toggleCategoryCollapse(catName));

    const titleGroup = document.createElement('div');
    titleGroup.className = 'category-title-group';

    const chevron = document.createElement('div');
    chevron.className = 'category-chevron';
    chevron.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';

    const title = document.createElement('h3');
    title.style.margin = '0';
    title.style.fontSize = '15px';
    title.style.fontWeight = '600';
    title.style.color = 'var(--text)';
    title.textContent = catName;

    const listCountBadge = document.createElement('span');
    listCountBadge.style.fontSize = '11px';
    listCountBadge.style.color = 'var(--text-dim)';
    listCountBadge.style.fontWeight = '500';
    listCountBadge.textContent = `${folders.length} list${folders.length !== 1 ? 's' : ''}`;

    titleGroup.append(chevron, title, listCountBadge);

    const statsSpan = document.createElement('span');
    statsSpan.style.fontSize = '12px';
    statsSpan.style.color = 'var(--accent)';
    statsSpan.style.fontWeight = '600';
    statsSpan.textContent = `${completedCategoryTasks}/${totalCategoryTasks} completed`;

    header.append(titleGroup, statsSpan);

    // Category Content (List of Task List Items)
    const content = document.createElement('div');
    content.className = 'category-content';

    folders.forEach(folder => {
      const listTasks = state.tasksByFolder[folder.id] || [];
      const completedCount = listTasks.filter(t => t.completed).length;

      const folderItem = document.createElement('div');
      folderItem.className = 'category-folder-item';
      folderItem.addEventListener('click', () => switchFolder(folder.id));

      const leftCol = document.createElement('div');
      leftCol.style.display = 'flex';
      leftCol.style.flexDirection = 'column';
      leftCol.style.gap = '2px';

      const fName = document.createElement('div');
      fName.style.fontWeight = '600';
      fName.style.fontSize = '14px';
      fName.style.color = 'var(--text)';
      fName.textContent = `${folder.type === 'scheduled' ? '⏰ ' : ''}${folder.name}`;

      leftCol.appendChild(fName);

      if (folder.description) {
        const fDesc = document.createElement('div');
        fDesc.style.fontSize = '12px';
        fDesc.style.color = 'var(--text-dim)';
        fDesc.style.fontStyle = 'italic';
        fDesc.textContent = folder.description;
        leftCol.appendChild(fDesc);
      }

      const rightCol = document.createElement('div');
      rightCol.style.display = 'flex';
      rightCol.style.alignItems = 'center';
      rightCol.style.gap = '10px';

      const taskBadge = document.createElement('span');
      taskBadge.style.fontSize = '11px';
      taskBadge.style.fontWeight = '600';
      taskBadge.style.color = 'var(--text-muted)';
      taskBadge.style.background = 'var(--bg-subtle)';
      taskBadge.style.padding = '3px 8px';
      taskBadge.style.borderRadius = '12px';
      taskBadge.style.border = '1px solid var(--border)';
      taskBadge.textContent = `${completedCount}/${listTasks.length} tasks`;

      const arrow = document.createElement('span');
      arrow.style.fontSize = '14px';
      arrow.style.color = 'var(--accent)';
      arrow.textContent = '→';

      rightCol.append(taskBadge, arrow);
      folderItem.append(leftCol, rightCol);
      content.appendChild(folderItem);
    });

    card.append(header, content);
    container.appendChild(card);
  });

  const emptyState = document.getElementById('emptyState');
  if (emptyState) emptyState.hidden = true;
}
