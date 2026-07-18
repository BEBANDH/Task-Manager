import { el } from './dom.js';
import { state } from './state.js';

export function renderDashboardChart() {
  const selector = el.chartListSelector;
  const chart = el.dashboardContributionChart;
  if (!selector || !chart) return;
  
  const selectedListId = selector.value || 'all';
  
  let filteredTasks = [];
  if (selectedListId === 'all') {
    Object.values(state.tasksByFolder).forEach(listTasks => {
      filteredTasks = filteredTasks.concat(listTasks);
    });
  } else {
    filteredTasks = state.tasksByFolder[selectedListId] || [];
  }
  
  const boxSize = 12;
  const boxGap = 4;
  const daysInYear = 365;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  const days = [];
  for (let i = daysInYear - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    days.push({
      date: d,
      dateStr: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      count: 0
    });
  }
  
  let totalCompleted = 0;
  filteredTasks.forEach(t => {
    if (!t.completedAt) return;
    const d = new Date(t.completedAt);
    const diffTime = today.getTime() - d.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < daysInYear) {
      const index = daysInYear - 1 - diffDays;
      days[index].count += 1;
      totalCompleted += 1;
    }
  });

  const totalsText = document.getElementById('dashboardChartTotals');
  if (totalsText) {
    totalsText.textContent = `${totalCompleted} tasks completed in the last 365 days`;
  }
  
  let chartArea = chart.querySelector('#dashboardChartArea');
  if (!chartArea) {
    chartArea = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    chartArea.id = 'dashboardChartArea';
    chart.appendChild(chartArea);
  }
  chartArea.innerHTML = '';
  
  const startDate = days[0].date;
  const startDayOfWeek = startDate.getDay();
  
  const totalCols = Math.ceil((daysInYear + startDayOfWeek) / 7);
  const leftOffset = 38;
  const topOffset = 22;
  
  const chartWidth = leftOffset + totalCols * (boxSize + boxGap) + 10;
  const chartHeight = topOffset + 7 * (boxSize + boxGap) + 5;
  
  chart.setAttribute('viewBox', `0 0 ${chartWidth} ${chartHeight}`);
  
  let tooltip = document.querySelector('.chart-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.display = 'none';
    tooltip.style.background = 'var(--bg-panel)';
    tooltip.style.border = '1px solid var(--border)';
    tooltip.style.padding = '6px 12px';
    tooltip.style.borderRadius = '6px';
    tooltip.style.fontSize = '12px';
    tooltip.style.color = 'var(--text)';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.whiteSpace = 'nowrap';
    tooltip.style.zIndex = '9999';
    tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    tooltip.style.fontWeight = '500';
    tooltip.style.transition = 'opacity 0.2s';
    tooltip.style.opacity = '0';
    document.body.appendChild(tooltip);
  }
  
  const max = Math.max(1, ...days.map(d => d.count));
  
  const dayLabels = [
    { label: 'Sun', row: 0 },
    { label: 'Mon', row: 1 },
    { label: 'Tue', row: 2 },
    { label: 'Wed', row: 3 },
    { label: 'Thu', row: 4 },
    { label: 'Fri', row: 5 },
    { label: 'Sat', row: 6 }
  ];
  dayLabels.forEach(lbl => {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', 5);
    text.setAttribute('y', topOffset + lbl.row * (boxSize + boxGap) + 9.5);
    text.setAttribute('fill', 'var(--text-dim)');
    text.style.fontSize = '9.5px';
    text.style.fontFamily = 'var(--font-display)';
    text.textContent = lbl.label;
    chartArea.appendChild(text);
  });

  let prevMonth = -1;
  days.forEach((day, i) => {
    const dayIndex = i + startDayOfWeek;
    const col = Math.floor(dayIndex / 7);
    const row = dayIndex % 7;
    
    const m = day.date.getMonth();
    if (m !== prevMonth && row === 0 && col > 0) {
      const monthText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      monthText.setAttribute('x', leftOffset + col * (boxSize + boxGap));
      monthText.setAttribute('y', 12);
      monthText.setAttribute('fill', 'var(--text-dim)');
      monthText.style.fontSize = '9px';
      monthText.style.fontFamily = 'var(--font-display)';
      monthText.textContent = day.date.toLocaleString(undefined, { month: 'short' });
      chartArea.appendChild(monthText);
      prevMonth = m;
    }

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', leftOffset + col * (boxSize + boxGap));
    rect.setAttribute('y', topOffset + row * (boxSize + boxGap));
    rect.setAttribute('width', boxSize);
    rect.setAttribute('height', boxSize);
    rect.setAttribute('rx', 2);
    
    if (day.count === 0) {
      rect.setAttribute('fill', 'var(--chart-empty)');
      rect.style.opacity = '1';
    } else {
      const intensity = Math.min(1, 0.3 + (day.count / max) * 0.7);
      rect.setAttribute('fill', 'var(--accent)');
      rect.style.opacity = intensity;
    }
    
    rect.addEventListener('mouseenter', (e) => {
      tooltip.textContent = `${day.count} task${day.count === 1 ? '' : 's'} completed on ${day.dateStr}`;
      tooltip.style.display = 'block';
      tooltip.style.opacity = '1';
      
      const tooltipX = e.pageX;
      const tooltipY = e.pageY - 30;
      
      tooltip.style.left = `${tooltipX}px`;
      tooltip.style.transform = 'translateX(-50%)';
      tooltip.style.top = `${tooltipY}px`;
    });
    
    rect.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
      tooltip.style.display = 'none';
    });
    
    chartArea.appendChild(rect);
  });
}

export function populateChartDropdown() {
  if (!el.chartListSelector) return;
  const currentVal = el.chartListSelector.value || 'all';
  el.chartListSelector.innerHTML = '<option value="all">All Lists (Combined)</option>';
  state.folders.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.name;
    el.chartListSelector.appendChild(opt);
  });
  el.chartListSelector.value = currentVal;
}
