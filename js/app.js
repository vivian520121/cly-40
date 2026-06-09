const App = (function() {
    const elements = {};
    const storedData = StorageManager.load();

    function init() {
        cacheElements();
        initModules();
        setupEventListeners();
        loadStoredData();
        updateUI();
    }

    function cacheElements() {
        elements.body = document.body;
        elements.modeTabs = document.querySelectorAll('.tab-btn');
        elements.timeDisplay = document.getElementById('timeDisplay');
        elements.startBtn = document.getElementById('startBtn');
        elements.startBtnText = document.getElementById('startBtnText');
        elements.resetBtn = document.getElementById('resetBtn');
        elements.skipBtn = document.getElementById('skipBtn');
        elements.soundToggle = document.getElementById('soundToggle');
        elements.fullscreenToggle = document.getElementById('fullscreenToggle');
        elements.ringProgress = document.querySelector('.ring-progress');
        elements.pomodoroStatus = document.getElementById('pomodoroStatus');
        elements.statusText = document.querySelector('.status-text');
        elements.statusIndicator = document.querySelector('.status-indicator');
        elements.completedPomodoros = document.getElementById('completedPomodoros');
        elements.targetPomodoros = document.getElementById('targetPomodoros');
        elements.pomodoroCounter = document.getElementById('pomodoroCounter');
        
        elements.pomodoroSettings = document.querySelector('.pomodoro-settings');
        elements.countdownSettings = document.querySelector('.countdown-settings');
        elements.stopwatchSettings = document.querySelector('.stopwatch-settings');
        
        elements.focusDuration = document.getElementById('focusDuration');
        elements.shortBreakDuration = document.getElementById('shortBreakDuration');
        elements.longBreakDuration = document.getElementById('longBreakDuration');
        
        elements.countdownHours = document.getElementById('countdownHours');
        elements.countdownMinutes = document.getElementById('countdownMinutes');
        elements.countdownSeconds = document.getElementById('countdownSeconds');
        elements.presetBtns = document.querySelectorAll('.preset-btn');
        
        elements.taskInput = document.getElementById('taskInput');
        elements.addTaskBtn = document.getElementById('addTaskBtn');
        elements.taskList = document.getElementById('taskList');
        elements.taskCount = document.getElementById('taskCount');
        elements.taskTemplate = document.getElementById('taskTemplate');
        
        elements.statPomodoros = document.getElementById('statPomodoros');
        elements.statFocusTime = document.getElementById('statFocusTime');
        elements.statTasks = document.getElementById('statTasks');
    }

    function initModules() {
        SoundManager.setEnabled(storedData.timerConfig.soundEnabled);
        Pomodoro.init(storedData.pomodoroConfig, storedData.stats);
        TaskManager.init(storedData.tasks);
        ProgressRing.init(elements.ringProgress);

        Timer.onTick(handleTick);
        Timer.onComplete(handleComplete);
        Timer.onStateChange(handleStateChange);

        Pomodoro.onPhaseChange(handlePhaseChange);
        Pomodoro.onPomodoroComplete(handlePomodoroComplete);

        TaskManager.onTasksChange(handleTasksChange);
    }

    function setupEventListeners() {
        elements.modeTabs.forEach(tab => {
            tab.addEventListener('click', () => switchMode(tab.dataset.mode));
        });

        elements.startBtn.addEventListener('click', toggleTimer);
        elements.resetBtn.addEventListener('click', resetTimer);
        elements.skipBtn.addEventListener('click', skipPomodoro);

        elements.soundToggle.addEventListener('click', toggleSound);
        elements.fullscreenToggle.addEventListener('click', toggleFullscreen);

        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.addEventListener('click', handleNumBtnClick);
        });

        [elements.focusDuration, elements.shortBreakDuration, elements.longBreakDuration].forEach(input => {
            input.addEventListener('change', handlePomodoroConfigChange);
        });

        [elements.countdownHours, elements.countdownMinutes, elements.countdownSeconds].forEach(input => {
            input.addEventListener('change', handleCountdownConfigChange);
        });

        elements.presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const seconds = parseInt(btn.dataset.seconds);
                setCountdownFromSeconds(seconds);
            });
        });

        elements.addTaskBtn.addEventListener('click', addTask);
        elements.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask();
        });

        document.addEventListener('keydown', handleKeydown);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
    }

    function loadStoredData() {
        const pomoConfig = Pomodoro.getConfig();
        elements.focusDuration.value = pomoConfig.focusDuration;
        elements.shortBreakDuration.value = pomoConfig.shortBreakDuration;
        elements.longBreakDuration.value = pomoConfig.longBreakDuration;

        const timerConfig = storedData.timerConfig;
        elements.countdownHours.value = timerConfig.countdownHours;
        elements.countdownMinutes.value = timerConfig.countdownMinutes;
        elements.countdownSeconds.value = timerConfig.countdownSeconds;

        updateSoundButton();
        updateStatsDisplay();
        renderTasks();
    }

    function switchMode(mode) {
        if (Timer.isRunning()) return;

        elements.modeTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });

        Timer.setMode(mode);

        elements.pomodoroSettings.classList.toggle('hidden', mode !== 'pomodoro');
        elements.countdownSettings.classList.toggle('hidden', mode !== 'countdown');
        elements.stopwatchSettings.classList.toggle('hidden', mode !== 'stopwatch');

        elements.pomodoroCounter.style.display = mode === 'pomodoro' ? 'flex' : 'none';
        elements.pomodoroStatus.style.display = mode === 'pomodoro' ? 'flex' : 'none';
        elements.skipBtn.style.display = mode === 'pomodoro' ? 'flex' : 'none';

        elements.body.classList.remove('mode-break', 'mode-stopwatch', 'mode-countdown');

        if (mode === 'pomodoro') {
            Pomodoro.resetSession();
            Timer.setDuration(Pomodoro.getPhaseDuration());
        } else if (mode === 'countdown') {
            elements.body.classList.add('mode-countdown');
            const seconds = getCountdownSeconds();
            Timer.setDuration(seconds > 0 ? seconds : 600);
        } else if (mode === 'stopwatch') {
            elements.body.classList.add('mode-stopwatch');
            Timer.setDuration(0);
        }

        ProgressRing.reset();
        updateTimeDisplay();
        updateBodyModeClass();
    }

    function toggleTimer() {
        SoundManager.playClickSound();
        
        if (Timer.isRunning()) {
            Timer.pause();
        } else {
            if (Timer.getMode() === Timer.MODE.POMODORO && Timer.getState() === Timer.STATE.IDLE) {
                if (Pomodoro.getPhase() === Pomodoro.PHASE.FOCUS) {
                    SoundManager.playFocusStartSound();
                } else {
                    SoundManager.playBreakStartSound();
                }
            }
            Timer.start();
        }
    }

    function resetTimer() {
        SoundManager.playClickSound();
        Timer.reset();
        
        if (Timer.getMode() === Timer.MODE.POMODORO) {
            Pomodoro.resetSession();
            Timer.setDuration(Pomodoro.getPhaseDuration());
        } else if (Timer.getMode() === Timer.MODE.COUNTDOWN) {
            const seconds = getCountdownSeconds();
            Timer.setDuration(seconds > 0 ? seconds : 600);
        }
        
        ProgressRing.reset();
        updateTimeDisplay();
        updateBodyModeClass();
    }

    function skipPomodoro() {
        if (Timer.getMode() !== Timer.MODE.POMODORO) return;
        SoundManager.playClickSound();
        
        Timer.reset();
        Pomodoro.skipPhase();
        
        const nextPhase = Pomodoro.getPhase();
        if (nextPhase === Pomodoro.PHASE.FOCUS) {
            SoundManager.playFocusStartSound();
        } else {
            SoundManager.playBreakStartSound();
        }
        
        Timer.setDuration(Pomodoro.getPhaseDuration());
        ProgressRing.reset();
        updateTimeDisplay();
        updateBodyModeClass();
        
        if (Pomodoro.shouldAutoStartNext()) {
            Timer.start();
        }
    }

    function handleTick(data) {
        elements.timeDisplay.textContent = data.formatted;
        
        const mode = Timer.getMode();
        if (mode === Timer.MODE.STOPWATCH) {
            ProgressRing.update(1, 1);
        } else {
            ProgressRing.update(data.remaining, data.total);
        }

        if (mode === Timer.MODE.POMODORO && data.remaining <= 3 && data.remaining > 0) {
            elements.timeDisplay.style.animation = 'pulse 0.5s ease-in-out infinite';
        } else {
            elements.timeDisplay.style.animation = 'none';
        }
    }

    function handleComplete(data) {
        SoundManager.playCompleteSound();
        elements.timeDisplay.style.animation = 'none';

        if (data.mode === Timer.MODE.POMODORO) {
            const activeTask = TaskManager.getActiveTask();
            if (activeTask && Pomodoro.getPhase() === Pomodoro.PHASE.FOCUS) {
                TaskManager.incrementTaskPomodoros(activeTask.id);
            }

            Pomodoro.nextPhase();
            
            Timer.setDuration(Pomodoro.getPhaseDuration());
            ProgressRing.reset();
            updateTimeDisplay();
            updateBodyModeClass();

            if (Pomodoro.shouldAutoStartNext()) {
                setTimeout(() => {
                    if (Pomodoro.getPhase() === Pomodoro.PHASE.FOCUS) {
                        SoundManager.playFocusStartSound();
                    } else {
                        SoundManager.playBreakStartSound();
                    }
                    Timer.start();
                }, 1000);
            }
        }

        if (Notification.permission === 'granted') {
            new Notification('计时结束', {
                body: data.mode === 'pomodoro' 
                    ? `${Pomodoro.getPhaseName()}时间到！` 
                    : '计时已完成！',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🍅</text></svg>'
            });
        }
    }

    function handleStateChange(state) {
        elements.startBtn.classList.toggle('running', state === Timer.STATE.RUNNING);
        elements.startBtnText.textContent = state === Timer.STATE.RUNNING ? '暂停' : 
                                           state === Timer.STATE.PAUSED ? '继续' : '开始';
        elements.body.classList.toggle('timer-running', state === Timer.STATE.RUNNING);
    }

    function handlePhaseChange(data) {
        elements.statusText.textContent = data.phaseName;
        updatePomodoroCounter();
        updateBodyModeClass();
    }

    function handlePomodoroComplete(data) {
        updatePomodoroCounter();
        updateStatsDisplay();
    }

    function handleTasksChange(data) {
        renderTasks();
        updateStatsDisplay();
    }

    function handleNumBtnClick(e) {
        const btn = e.currentTarget;
        const field = btn.dataset.field;
        const input = document.getElementById(field);
        const isPlus = btn.classList.contains('plus');
        const step = parseInt(input.step) || 1;
        const min = parseInt(input.min) || 0;
        const max = parseInt(input.max) || 120;
        
        let value = parseInt(input.value) || 0;
        if (isPlus) {
            value = Math.min(max, value + step);
        } else {
            value = Math.max(min, value - step);
        }
        input.value = value;
        
        if (Timer.getMode() === Timer.MODE.POMODORO && !Timer.isRunning()) {
            handlePomodoroConfigChange();
        }
    }

    function handlePomodoroConfigChange() {
        const config = {
            focusDuration: parseInt(elements.focusDuration.value) || 25,
            shortBreakDuration: parseInt(elements.shortBreakDuration.value) || 5,
            longBreakDuration: parseInt(elements.longBreakDuration.value) || 15
        };
        Pomodoro.updateConfig(config);

        if (Timer.getMode() === Timer.MODE.POMODORO && !Timer.isRunning()) {
            Timer.setDuration(Pomodoro.getPhaseDuration());
            updateTimeDisplay();
        }
    }

    function handleCountdownConfigChange() {
        const config = {
            countdownHours: parseInt(elements.countdownHours.value) || 0,
            countdownMinutes: parseInt(elements.countdownMinutes.value) || 0,
            countdownSeconds: parseInt(elements.countdownSeconds.value) || 0
        };
        StorageManager.saveTimerConfig(config);

        if (Timer.getMode() === Timer.MODE.COUNTDOWN && !Timer.isRunning()) {
            const seconds = getCountdownSeconds();
            Timer.setDuration(seconds > 0 ? seconds : 1);
            updateTimeDisplay();
        }
    }

    function getCountdownSeconds() {
        const h = parseInt(elements.countdownHours.value) || 0;
        const m = parseInt(elements.countdownMinutes.value) || 0;
        const s = parseInt(elements.countdownSeconds.value) || 0;
        return h * 3600 + m * 60 + s;
    }

    function setCountdownFromSeconds(totalSeconds) {
        elements.countdownHours.value = Math.floor(totalSeconds / 3600);
        elements.countdownMinutes.value = Math.floor((totalSeconds % 3600) / 60);
        elements.countdownSeconds.value = totalSeconds % 60;
        handleCountdownConfigChange();
    }

    function addTask() {
        const text = elements.taskInput.value.trim();
        if (!text) return;
        
        SoundManager.playClickSound();
        const task = TaskManager.addTask(text);
        if (task) {
            elements.taskInput.value = '';
            if (TaskManager.getTasks().length === 1) {
                TaskManager.setActiveTask(task.id);
            }
        }
    }

    function renderTasks() {
        const tasks = TaskManager.getTasks();
        elements.taskCount.textContent = `${tasks.length} 项`;
        elements.taskList.innerHTML = '';

        if (tasks.length === 0) {
            elements.taskList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <div class="empty-state-text">暂无任务，添加一个开始专注吧</div>
                </div>
            `;
            return;
        }

        const template = elements.taskTemplate.querySelector('.task-item');
        
        tasks.forEach(task => {
            const element = template.cloneNode(true);
            element.dataset.id = task.id;
            if (task.completed) element.classList.add('completed');
            if (task.id === TaskManager.getActiveTask()?.id) {
                element.style.borderColor = 'var(--color-accent-neutral)';
            }

            const checkbox = element.querySelector('.task-checkbox');
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => {
                TaskManager.toggleTask(task.id);
            });

            element.querySelector('.task-text').textContent = task.text;
            element.querySelector('.pomo-count').textContent = task.pomodoros;

            element.querySelector('.task-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                TaskManager.deleteTask(task.id);
            });

            element.addEventListener('click', (e) => {
                if (e.target.closest('.task-delete') || e.target.closest('.checkbox-wrapper')) return;
                TaskManager.setActiveTask(task.id);
                renderTasks();
            });

            elements.taskList.appendChild(element);
        });
    }

    function toggleSound() {
        const enabled = !SoundManager.isEnabled();
        SoundManager.setEnabled(enabled);
        StorageManager.saveTimerConfig({ soundEnabled: enabled });
        updateSoundButton();
        
        if (enabled) {
            SoundManager.playClickSound();
        }
    }

    function updateSoundButton() {
        const enabled = SoundManager.isEnabled();
        elements.soundToggle.classList.toggle('sound-on', enabled);
        elements.soundToggle.classList.toggle('sound-off', !enabled);
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            elements.body.classList.add('fullscreen-mode');
        } else {
            document.exitFullscreen();
        }
    }

    function handleFullscreenChange() {
        elements.body.classList.toggle('fullscreen-mode', !!document.fullscreenElement);
    }

    function handleKeydown(e) {
        if (e.target.tagName === 'INPUT') return;

        if (e.code === 'Space') {
            e.preventDefault();
            toggleTimer();
        } else if (e.code === 'KeyR') {
            resetTimer();
        } else if (e.code === 'Escape' && document.fullscreenElement) {
            document.exitFullscreen();
        } else if (e.code === 'KeyF' && e.ctrlKey) {
            e.preventDefault();
            toggleFullscreen();
        }
    }

    function updateTimeDisplay() {
        const mode = Timer.getMode();
        let seconds;
        
        if (mode === Timer.MODE.STOPWATCH) {
            seconds = Timer.getElapsedSeconds();
        } else {
            seconds = Timer.getRemainingSeconds();
        }
        
        elements.timeDisplay.textContent = Timer.formatTime(seconds);
    }

    function updatePomodoroCounter() {
        elements.completedPomodoros.textContent = Pomodoro.getCompletedPomodorosInSession();
        elements.targetPomodoros.textContent = Pomodoro.getLongBreakInterval();
    }

    function updateBodyModeClass() {
        elements.body.classList.remove('mode-break');
        
        if (Timer.getMode() === Timer.MODE.POMODORO) {
            if (Pomodoro.getPhase() !== Pomodoro.PHASE.FOCUS) {
                elements.body.classList.add('mode-break');
            }
        }
    }

    function updateStatsDisplay() {
        const data = StorageManager.load();
        const stats = data.stats;
        
        elements.statPomodoros.textContent = stats.completedPomodoros;
        
        const hours = Math.floor(stats.totalFocusTime / 3600);
        const minutes = Math.floor((stats.totalFocusTime % 3600) / 60);
        if (hours > 0) {
            elements.statFocusTime.textContent = `${hours}h${minutes > 0 ? minutes + 'm' : ''}`;
        } else {
            elements.statFocusTime.textContent = `${minutes}m`;
        }
        
        elements.statTasks.textContent = stats.completedTasks;
    }

    function updateUI() {
        switchMode(Timer.getMode());
        updateTimeDisplay();
        updatePomodoroCounter();
        updateBodyModeClass();
    }

    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        init
    };
})();
