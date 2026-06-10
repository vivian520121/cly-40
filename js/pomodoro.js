const Pomodoro = (function() {
    const PHASE = {
        FOCUS: 'focus',
        SHORT_BREAK: 'shortBreak',
        LONG_BREAK: 'longBreak'
    };

    let config = {
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        longBreakInterval: 4,
        autoStartBreak: false,
        autoStartFocus: false
    };

    let currentPhase = PHASE.FOCUS;
    let completedPomodorosInSession = 0;
    let totalCompletedPomodoros = 0;
    let currentPhaseStartTime = 0;
    let onPhaseChangeCallback = null;
    let onPomodoroCompleteCallback = null;

    function init(storedConfig, storedStats) {
        if (storedConfig) {
            config = { ...config, ...storedConfig };
        }
        if (storedStats && storedStats.completedPomodoros) {
            totalCompletedPomodoros = storedStats.completedPomodoros;
        }
    }

    function getConfig() {
        return { ...config };
    }

    function updateConfig(newConfig) {
        config = { ...config, ...newConfig };
        StorageManager.savePomodoroConfig(config);
    }

    function getPhase() {
        return currentPhase;
    }

    function getPhaseDuration() {
        switch (currentPhase) {
            case PHASE.FOCUS:
                return config.focusDuration * 60;
            case PHASE.SHORT_BREAK:
                return config.shortBreakDuration * 60;
            case PHASE.LONG_BREAK:
                return config.longBreakDuration * 60;
            default:
                return config.focusDuration * 60;
        }
    }

    function getPhaseName() {
        switch (currentPhase) {
            case PHASE.FOCUS:
                return '专注中';
            case PHASE.SHORT_BREAK:
                return '短休息';
            case PHASE.LONG_BREAK:
                return '长休息';
            default:
                return '准备专注';
        }
    }

    function getCompletedPomodorosInSession() {
        return completedPomodorosInSession;
    }

    function getTotalCompletedPomodoros() {
        return totalCompletedPomodoros;
    }

    function getLongBreakInterval() {
        return config.longBreakInterval;
    }

    function setPhaseStartTime(time) {
        currentPhaseStartTime = time;
    }

    function getPhaseStartTime() {
        return currentPhaseStartTime;
    }

    function shouldAutoStartNext() {
        if (currentPhase === PHASE.FOCUS) {
            return config.autoStartBreak;
        }
        return config.autoStartFocus;
    }

    function nextPhase(activeTask) {
        const endTime = Date.now();
        
        if (currentPhase === PHASE.FOCUS) {
            completedPomodorosInSession++;
            totalCompletedPomodoros++;
            
            const duration = getPhaseDuration();
            StorageManager.incrementPomodoros(duration);
            
            StorageManager.addFocusRecord({
                startTime: currentPhaseStartTime || (endTime - duration * 1000),
                endTime: endTime,
                duration: duration,
                taskId: activeTask?.id || null,
                taskText: activeTask?.text || ''
            });
            
            if (onPomodoroCompleteCallback) {
                onPomodoroCompleteCallback({
                    count: completedPomodorosInSession,
                    total: totalCompletedPomodoros
                });
            }

            if (completedPomodorosInSession % config.longBreakInterval === 0) {
                currentPhase = PHASE.LONG_BREAK;
            } else {
                currentPhase = PHASE.SHORT_BREAK;
            }
        } else {
            currentPhase = PHASE.FOCUS;
        }

        if (onPhaseChangeCallback) {
            onPhaseChangeCallback({
                phase: currentPhase,
                phaseName: getPhaseName(),
                duration: getPhaseDuration()
            });
        }

        return currentPhase;
    }

    function skipPhase(activeTask) {
        return nextPhase(activeTask);
    }

    function resetSession() {
        currentPhase = PHASE.FOCUS;
        completedPomodorosInSession = 0;
        
        if (onPhaseChangeCallback) {
            onPhaseChangeCallback({
                phase: currentPhase,
                phaseName: '准备专注',
                duration: getPhaseDuration()
            });
        }
    }

    function onPhaseChange(callback) {
        onPhaseChangeCallback = callback;
    }

    function onPomodoroComplete(callback) {
        onPomodoroCompleteCallback = callback;
    }

    return {
        PHASE,
        init,
        getConfig,
        updateConfig,
        getPhase,
        getPhaseDuration,
        getPhaseName,
        getCompletedPomodorosInSession,
        getTotalCompletedPomodoros,
        getLongBreakInterval,
        shouldAutoStartNext,
        setPhaseStartTime,
        getPhaseStartTime,
        nextPhase,
        skipPhase,
        resetSession,
        onPhaseChange,
        onPomodoroComplete
    };
})();
