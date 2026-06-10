const Statistics = (function() {
    const elements = {};
    let currentFilter = { startDate: null, endDate: null };
    let heatmapRange = 'week';
    let linechartRange = 'week';
    let onDataChangeCallback = null;

    function init() {
        cacheElements();
        setupEventListeners();
        setDefaultDates();
    }

    function cacheElements() {
        elements.filterStartDate = document.getElementById('filterStartDate');
        elements.filterEndDate = document.getElementById('filterEndDate');
        elements.filterBtn = document.getElementById('filterBtn');
        elements.resetFilterBtn = document.getElementById('resetFilterBtn');
        elements.generateReportBtn = document.getElementById('generateReportBtn');
        
        elements.sumPomodoros = document.getElementById('sumPomodoros');
        elements.sumFocusTime = document.getElementById('sumFocusTime');
        elements.sumTasks = document.getElementById('sumTasks');
        elements.sumStreak = document.getElementById('sumStreak');
        
        elements.heatmapContainer = document.getElementById('heatmapContainer');
        elements.linechartCanvas = document.getElementById('linechartCanvas');
        elements.piechartCanvas = document.getElementById('piechartCanvas');
        elements.piechartLegend = document.getElementById('piechartLegend');
        elements.historyList = document.getElementById('historyList');
        
        elements.heatmapTabs = document.querySelectorAll('#heatmapContainer ~ .chart-tabs .chart-tab-btn, .chart-card:first-child .chart-tab-btn');
        elements.linechartTabs = document.querySelectorAll('.chart-card:nth-child(2) .chart-tab-btn');
    }

    function setupEventListeners() {
        elements.filterBtn.addEventListener('click', applyFilter);
        elements.resetFilterBtn.addEventListener('click', resetFilter);
        elements.generateReportBtn.addEventListener('click', generateTodayReport);
        
        document.querySelectorAll('.chart-card:first-child .chart-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.chart-card:first-child .chart-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                heatmapRange = btn.dataset.range;
                renderHeatmap();
            });
        });
        
        document.querySelectorAll('.chart-card:nth-child(2) .chart-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.chart-card:nth-child(2) .chart-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                linechartRange = btn.dataset.range;
                renderLineChart();
            });
        });
    }

    function setDefaultDates() {
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        elements.filterStartDate.value = formatDate(lastWeek);
        elements.filterEndDate.value = formatDate(today);
    }

    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    function applyFilter() {
        currentFilter.startDate = elements.filterStartDate.value;
        currentFilter.endDate = elements.filterEndDate.value;
        refreshAll();
    }

    function resetFilter() {
        currentFilter.startDate = null;
        currentFilter.endDate = null;
        setDefaultDates();
        refreshAll();
    }

    function getFilteredData() {
        return StorageManager.getFocusHistory(currentFilter.startDate, currentFilter.endDate);
    }

    function calculateStats(history) {
        const totalPomodoros = history.length;
        const totalFocusSeconds = history.reduce((sum, r) => sum + r.duration, 0);
        
        const taskIds = new Set();
        history.forEach(r => {
            if (r.taskId) taskIds.add(r.taskId);
        });
        
        const streak = calculateStreak(history);
        
        return {
            totalPomodoros,
            totalFocusSeconds,
            completedTasks: taskIds.size,
            streak
        };
    }

    function calculateStreak(history) {
        if (history.length === 0) return 0;
        
        const dates = new Set(history.map(r => r.date));
        let streak = 0;
        let currentDate = new Date();
        
        while (true) {
            const dateStr = formatDate(currentDate);
            if (dates.has(dateStr)) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        return streak;
    }

    function formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    function updateSummaryCards() {
        const history = getFilteredData();
        const stats = calculateStats(history);
        
        elements.sumPomodoros.textContent = stats.totalPomodoros;
        elements.sumFocusTime.textContent = formatDuration(stats.totalFocusSeconds);
        elements.sumTasks.textContent = stats.completedTasks;
        elements.sumStreak.textContent = stats.streak;
    }

    function aggregateByDate(history) {
        const byDate = {};
        history.forEach(r => {
            if (!byDate[r.date]) {
                byDate[r.date] = { count: 0, duration: 0 };
            }
            byDate[r.date].count++;
            byDate[r.date].duration += r.duration;
        });
        return byDate;
    }

    function renderHeatmap() {
        const history = getFilteredData();
        const byDate = aggregateByDate(history);
        
        const days = heatmapRange === 'week' ? 7 : 30;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        elements.heatmapContainer.innerHTML = '';
        
        const heatmapGrid = document.createElement('div');
        heatmapGrid.className = 'heatmap-grid';
        
        const maxCount = Math.max(...Object.values(byDate).map(d => d.count), 1);
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = formatDate(date);
            const data = byDate[dateStr] || { count: 0, duration: 0 };
            
            const level = data.count === 0 ? 0 : 
                         data.count <= maxCount * 0.25 ? 1 :
                         data.count <= maxCount * 0.5 ? 2 :
                         data.count <= maxCount * 0.75 ? 3 : 4;
            
            const cell = document.createElement('div');
            cell.className = `heatmap-cell level-${level}`;
            cell.title = `${dateStr}: ${data.count}个番茄, ${formatDuration(data.duration)}`;
            
            const dayLabel = document.createElement('span');
            dayLabel.className = 'heatmap-day';
            dayLabel.textContent = date.getDate();
            cell.appendChild(dayLabel);
            
            const countLabel = document.createElement('span');
            countLabel.className = 'heatmap-count';
            countLabel.textContent = data.count > 0 ? `${data.count}🍅` : '';
            cell.appendChild(countLabel);
            
            heatmapGrid.appendChild(cell);
        }
        
        elements.heatmapContainer.appendChild(heatmapGrid);
    }

    function renderLineChart() {
        const canvas = elements.linechartCanvas;
        const ctx = canvas.getContext('2d');
        const history = getFilteredData();
        const byDate = aggregateByDate(history);
        
        const days = linechartRange === 'week' ? 7 : 30;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const labels = [];
        const data = [];
        let maxDuration = 0;
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = formatDate(date);
            const duration = byDate[dateStr]?.duration || 0;
            maxDuration = Math.max(maxDuration, duration);
            
            if (linechartRange === 'week') {
                labels.push(['日', '一', '二', '三', '四', '五', '六'][date.getDay()]);
            } else {
                labels.push(date.getDate().toString());
            }
            data.push(duration / 60);
        }
        
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        const width = rect.width;
        const height = rect.height;
        const padding = { top: 20, right: 20, bottom: 30, left: 50 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        
        ctx.clearRect(0, 0, width, height);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        const yTicks = 5;
        for (let i = 0; i <= yTicks; i++) {
            const y = padding.top + (chartHeight / yTicks) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            
            const value = Math.round((maxDuration / 60 / yTicks) * (yTicks - i));
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '11px Inter';
            ctx.textAlign = 'right';
            ctx.fillText(`${value}h`, padding.left - 8, y + 4);
        }
        
        const xStep = chartWidth / (data.length - 1 || 1);
        const points = data.map((value, index) => {
            const x = padding.left + xStep * index;
            const y = padding.top + chartHeight - (value / (maxDuration / 60 || 1)) * chartHeight;
            return { x, y };
        });
        
        const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
        gradient.addColorStop(0, 'rgba(243, 156, 18, 0.3)');
        gradient.addColorStop(1, 'rgba(243, 156, 18, 0)');
        
        ctx.beginPath();
        ctx.moveTo(points[0].x, height - padding.bottom);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.beginPath();
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        
        points.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#f39c12';
            ctx.fill();
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '11px Inter';
        ctx.textAlign = 'center';
        labels.forEach((label, i) => {
            const x = padding.left + xStep * i;
            ctx.fillText(label, x, height - 10);
        });
    }

    function renderPieChart() {
        const canvas = elements.piechartCanvas;
        const ctx = canvas.getContext('2d');
        const history = getFilteredData();
        
        const taskStats = {};
        history.forEach(r => {
            const taskKey = r.taskText || '未分类';
            if (!taskStats[taskKey]) {
                taskStats[taskKey] = { count: 0, duration: 0 };
            }
            taskStats[taskKey].count++;
            taskStats[taskKey].duration += r.duration;
        });
        
        const sortedTasks = Object.entries(taskStats)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 6);
        
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
        const total = sortedTasks.reduce((sum, t) => sum + t[1].count, 0);
        
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        const width = rect.width;
        const height = rect.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 20;
        
        ctx.clearRect(0, 0, width, height);
        
        if (total === 0) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fill();
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('暂无数据', centerX, centerY);
        } else {
            let startAngle = -Math.PI / 2;
            
            sortedTasks.forEach(([task, stats], i) => {
                const sliceAngle = (stats.count / total) * Math.PI * 2;
                const endAngle = startAngle + sliceAngle;
                
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, startAngle, endAngle);
                ctx.closePath();
                ctx.fillStyle = colors[i % colors.length];
                ctx.fill();
                
                startAngle = endAngle;
            });
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#1a1a2e';
            ctx.fill();
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(total.toString(), centerX, centerY - 5);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '12px Inter';
            ctx.fillText('个番茄', centerX, centerY + 15);
        }
        
        elements.piechartLegend.innerHTML = '';
        sortedTasks.forEach(([task, stats], i) => {
            const item = document.createElement('div');
            item.className = 'pie-legend-item';
            
            const color = document.createElement('span');
            color.className = 'pie-legend-color';
            color.style.background = colors[i % colors.length];
            
            const text = document.createElement('span');
            text.className = 'pie-legend-text';
            text.textContent = task.length > 10 ? task.substring(0, 10) + '...' : task;
            
            const count = document.createElement('span');
            count.className = 'pie-legend-count';
            count.textContent = `${stats.count}🍅`;
            
            item.appendChild(color);
            item.appendChild(text);
            item.appendChild(count);
            elements.piechartLegend.appendChild(item);
        });
    }

    function renderHistoryList() {
        const history = getFilteredData();
        elements.historyList.innerHTML = '';
        
        if (history.length === 0) {
            elements.historyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <div class="empty-state-text">暂无专注记录，开始你的第一个番茄钟吧！</div>
                </div>
            `;
            return;
        }
        
        const grouped = {};
        history.forEach(r => {
            if (!grouped[r.date]) grouped[r.date] = [];
            grouped[r.date].push(r);
        });
        
        Object.entries(grouped).forEach(([date, records]) => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'history-date-group';
            
            const dateHeader = document.createElement('div');
            dateHeader.className = 'history-date-header';
            
            const dateObj = new Date(date);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            let dateLabel = date;
            if (date === formatDate(today)) dateLabel = '今天';
            else if (date === formatDate(yesterday)) dateLabel = '昨天';
            
            dateHeader.innerHTML = `
                <span class="history-date-text">${dateLabel}</span>
                <span class="history-date-stats">${records.length}🍅 · ${formatDuration(records.reduce((s, r) => s + r.duration, 0))}</span>
            `;
            dateGroup.appendChild(dateHeader);
            
            records.forEach(record => {
                const item = document.createElement('div');
                item.className = 'history-item';
                
                const startTime = new Date(record.startTime);
                const endTime = new Date(record.endTime);
                const timeStr = `${startTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
                
                item.innerHTML = `
                    <div class="history-time">${timeStr}</div>
                    <div class="history-task">${record.taskText || '未指定任务'}</div>
                    <div class="history-duration">${Math.round(record.duration / 60)}分钟</div>
                `;
                dateGroup.appendChild(item);
            });
            
            elements.historyList.appendChild(dateGroup);
        });
    }

    function generateTodayReport() {
        const today = formatDate(new Date());
        const todayHistory = StorageManager.getFocusHistory(today, today);
        const stats = calculateStats(todayHistory);
        const tasks = {};
        
        todayHistory.forEach(r => {
            const key = r.taskText || '未分类';
            if (!tasks[key]) tasks[key] = { count: 0, duration: 0 };
            tasks[key].count++;
            tasks[key].duration += r.duration;
        });
        
        const sortedTasks = Object.entries(tasks).sort((a, b) => b[1].count - a[1].count);
        
        let report = `📅 今日专注报告 - ${today}\n\n`;
        report += `🍅 完成番茄: ${stats.totalPomodoros} 个\n`;
        report += `⏱️ 专注时长: ${formatDuration(stats.totalFocusSeconds)}\n`;
        report += `✅ 专注任务: ${stats.completedTasks} 个\n\n`;
        
        if (sortedTasks.length > 0) {
            report += `📝 任务详情:\n`;
            sortedTasks.forEach(([task, s], i) => {
                report += `${i + 1}. ${task}: ${s.count}🍅 (${formatDuration(s.duration)})\n`;
            });
        }
        
        report += `\n💪 继续保持专注！`;
        
        const reportWindow = window.open('', '_blank');
        if (!reportWindow) {
            alert('请允许弹出窗口以生成报告');
            return;
        }
        reportWindow.document.open();
        reportWindow.document.write(`
            <html>
            <head>
                <title>今日专注报告 - ${today}</title>
                <style>
                    body {
                        font-family: 'Inter', 'PingFang SC', sans-serif;
                        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                        color: #ecf0f1;
                        padding: 40px;
                        min-height: 100vh;
                    }
                    .report-container {
                        max-width: 600px;
                        margin: 0 auto;
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 20px;
                        padding: 40px;
                    }
                    .report-title {
                        font-size: 24px;
                        font-weight: 700;
                        margin-bottom: 30px;
                        text-align: center;
                    }
                    .report-stats {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 16px;
                        margin-bottom: 30px;
                    }
                    .stat-card {
                        text-align: center;
                        padding: 20px;
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 12px;
                    }
                    .stat-value {
                        font-size: 32px;
                        font-weight: 700;
                        color: #f39c12;
                        display: block;
                        margin-bottom: 4px;
                    }
                    .stat-label {
                        font-size: 13px;
                        color: rgba(255, 255, 255, 0.6);
                    }
                    .report-section {
                        margin-bottom: 20px;
                    }
                    .section-title {
                        font-size: 16px;
                        font-weight: 600;
                        margin-bottom: 12px;
                        color: rgba(255, 255, 255, 0.8);
                    }
                    .task-item {
                        display: flex;
                        justify-content: space-between;
                        padding: 12px;
                        background: rgba(255, 255, 255, 0.03);
                        border-radius: 8px;
                        margin-bottom: 8px;
                    }
                    .task-name {
                        flex: 1;
                    }
                    .task-stats {
                        color: #f39c12;
                    }
                    .report-footer {
                        text-align: center;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                        color: rgba(255, 255, 255, 0.5);
                        font-size: 14px;
                    }
                    .btn-download {
                        display: inline-block;
                        margin-top: 20px;
                        padding: 12px 24px;
                        background: #f39c12;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                    }
                    .empty-state {
                        text-align: center;
                        padding: 40px;
                        color: rgba(255, 255, 255, 0.5);
                    }
                </style>
            </head>
            <body>
                <div class="report-container">
                    <h1 class="report-title">📅 今日专注报告</h1>
                    <div class="report-stats">
                        <div class="stat-card">
                            <span class="stat-value">${stats.totalPomodoros}</span>
                            <span class="stat-label">完成番茄</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value">${formatDuration(stats.totalFocusSeconds)}</span>
                            <span class="stat-label">专注时长</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-value">${stats.completedTasks}</span>
                            <span class="stat-label">专注任务</span>
                        </div>
                    </div>
                    ${sortedTasks.length > 0 ? `
                    <div class="report-section">
                        <div class="section-title">📝 任务详情</div>
                        ${sortedTasks.map(([task, s], i) => `
                            <div class="task-item">
                                <span class="task-name">${i + 1}. ${task}</span>
                                <span class="task-stats">${s.count}🍅 (${formatDuration(s.duration)})</span>
                            </div>
                        `).join('')}
                    </div>
                    ` : `
                    <div class="empty-state">今天还没有专注记录，开始第一个番茄钟吧！</div>
                    `}
                    <div class="report-footer">
                        💪 继续保持专注！
                        <br>
                        <button class="btn-download" onclick="window.print()">下载/打印报告</button>
                    </div>
                </div>
            </body>
            </html>
        `);
        reportWindow.document.close();
    }

    function refreshAll() {
        updateSummaryCards();
        renderHeatmap();
        renderLineChart();
        renderPieChart();
        renderHistoryList();
        
        if (onDataChangeCallback) {
            onDataChangeCallback();
        }
    }

    function onDataChange(callback) {
        onDataChangeCallback = callback;
    }

    return {
        init,
        refreshAll,
        updateSummaryCards,
        renderHeatmap,
        renderLineChart,
        renderPieChart,
        renderHistoryList,
        generateTodayReport,
        onDataChange
    };
})();
