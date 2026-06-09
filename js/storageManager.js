const StorageManager = (function() {
    const STORAGE_KEY = 'focusTimerData';

    const defaultData = {
        pomodoroConfig: {
            focusDuration: 25,
            shortBreakDuration: 5,
            longBreakDuration: 15,
            longBreakInterval: 4,
            autoStartBreak: false,
            autoStartFocus: false
        },
        timerConfig: {
            countdownHours: 0,
            countdownMinutes: 10,
            countdownSeconds: 0,
            soundEnabled: true
        },
        tasks: [],
        stats: {
            completedPomodoros: 0,
            totalFocusTime: 0,
            completedTasks: 0
        }
    };

    function load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return {
                    pomodoroConfig: { ...defaultData.pomodoroConfig, ...parsed.pomodoroConfig },
                    timerConfig: { ...defaultData.timerConfig, ...parsed.timerConfig },
                    tasks: parsed.tasks || defaultData.tasks,
                    stats: { ...defaultData.stats, ...parsed.stats }
                };
            }
        } catch (e) {
            console.error('Failed to load data from localStorage:', e);
        }
        return JSON.parse(JSON.stringify(defaultData));
    }

    function save(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Failed to save data to localStorage:', e);
            return false;
        }
    }

    function savePomodoroConfig(config) {
        const data = load();
        data.pomodoroConfig = { ...data.pomodoroConfig, ...config };
        return save(data);
    }

    function saveTimerConfig(config) {
        const data = load();
        data.timerConfig = { ...data.timerConfig, ...config };
        return save(data);
    }

    function saveTasks(tasks) {
        const data = load();
        data.tasks = tasks;
        return save(data);
    }

    function saveStats(stats) {
        const data = load();
        data.stats = { ...data.stats, ...stats };
        return save(data);
    }

    function incrementPomodoros(durationSeconds) {
        const data = load();
        data.stats.completedPomodoros += 1;
        data.stats.totalFocusTime += durationSeconds;
        return save(data);
    }

    function incrementCompletedTasks() {
        const data = load();
        data.stats.completedTasks += 1;
        return save(data);
    }

    return {
        load,
        save,
        savePomodoroConfig,
        saveTimerConfig,
        saveTasks,
        saveStats,
        incrementPomodoros,
        incrementCompletedTasks
    };
})();
