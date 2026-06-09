const Timer = (function() {
    const STATE = {
        IDLE: 'idle',
        RUNNING: 'running',
        PAUSED: 'paused',
        COMPLETED: 'completed'
    };

    const MODE = {
        POMODORO: 'pomodoro',
        COUNTDOWN: 'countdown',
        STOPWATCH: 'stopwatch'
    };

    let state = STATE.IDLE;
    let mode = MODE.POMODORO;
    let totalSeconds = 25 * 60;
    let remainingSeconds = totalSeconds;
    let elapsedSeconds = 0;
    let intervalId = null;
    let startTime = null;
    let pausedTime = 0;
    
    let onTickCallback = null;
    let onCompleteCallback = null;
    let onStateChangeCallback = null;

    function setMode(newMode) {
        if (state === STATE.RUNNING) return false;
        mode = newMode;
        state = STATE.IDLE;
        return true;
    }

    function getMode() {
        return mode;
    }

    function setDuration(seconds) {
        if (state === STATE.RUNNING) return false;
        totalSeconds = Math.max(0, seconds);
        remainingSeconds = totalSeconds;
        elapsedSeconds = 0;
        return true;
    }

    function getTotalSeconds() {
        return totalSeconds;
    }

    function getRemainingSeconds() {
        return remainingSeconds;
    }

    function getElapsedSeconds() {
        if (mode === MODE.STOPWATCH) {
            return elapsedSeconds;
        }
        return totalSeconds - remainingSeconds;
    }

    function getState() {
        return state;
    }

    function isRunning() {
        return state === STATE.RUNNING;
    }

    function formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function tick() {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000) + pausedTime;

        if (mode === MODE.STOPWATCH) {
            elapsedSeconds = elapsed;
            if (onTickCallback) {
                onTickCallback({
                    remaining: elapsedSeconds,
                    total: elapsedSeconds + 1,
                    elapsed: elapsedSeconds,
                    formatted: formatTime(elapsedSeconds)
                });
            }
        } else {
            remainingSeconds = Math.max(0, totalSeconds - elapsed);
            
            if (onTickCallback) {
                onTickCallback({
                    remaining: remainingSeconds,
                    total: totalSeconds,
                    elapsed: totalSeconds - remainingSeconds,
                    formatted: formatTime(remainingSeconds)
                });
            }

            if (remainingSeconds <= 0) {
                complete();
            }
        }
    }

    function start() {
        if (state === STATE.RUNNING) return false;
        
        if (state === STATE.IDLE || state === STATE.COMPLETED) {
            startTime = Date.now();
            pausedTime = 0;
            if (mode !== MODE.STOPWATCH) {
                remainingSeconds = totalSeconds;
            }
            elapsedSeconds = 0;
        } else if (state === STATE.PAUSED) {
            startTime = Date.now();
        }

        state = STATE.RUNNING;
        intervalId = setInterval(tick, 1000);
        
        if (onStateChangeCallback) {
            onStateChangeCallback(state);
        }
        
        return true;
    }

    function pause() {
        if (state !== STATE.RUNNING) return false;
        
        clearInterval(intervalId);
        intervalId = null;
        
        if (mode === MODE.STOPWATCH) {
            pausedTime = elapsedSeconds;
        } else {
            pausedTime = totalSeconds - remainingSeconds;
        }
        
        state = STATE.PAUSED;
        
        if (onStateChangeCallback) {
            onStateChangeCallback(state);
        }
        
        return true;
    }

    function reset() {
        clearInterval(intervalId);
        intervalId = null;
        startTime = null;
        pausedTime = 0;
        remainingSeconds = totalSeconds;
        elapsedSeconds = 0;
        state = STATE.IDLE;
        
        if (onStateChangeCallback) {
            onStateChangeCallback(state);
        }
        
        return true;
    }

    function complete() {
        clearInterval(intervalId);
        intervalId = null;
        remainingSeconds = 0;
        state = STATE.COMPLETED;
        
        if (onTickCallback) {
            onTickCallback({
                remaining: 0,
                total: totalSeconds,
                elapsed: totalSeconds,
                formatted: formatTime(0)
            });
        }
        
        if (onStateChangeCallback) {
            onStateChangeCallback(state);
        }
        
        if (onCompleteCallback) {
            onCompleteCallback({
                totalSeconds,
                mode
            });
        }
    }

    function onTick(callback) {
        onTickCallback = callback;
    }

    function onComplete(callback) {
        onCompleteCallback = callback;
    }

    function onStateChange(callback) {
        onStateChangeCallback = callback;
    }

    return {
        STATE,
        MODE,
        setMode,
        getMode,
        setDuration,
        getTotalSeconds,
        getRemainingSeconds,
        getElapsedSeconds,
        getState,
        isRunning,
        start,
        pause,
        reset,
        formatTime,
        onTick,
        onComplete,
        onStateChange
    };
})();
