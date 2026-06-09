const TaskManager = (function() {
    let tasks = [];
    let activeTaskId = null;
    let onTasksChangeCallback = null;

    function init(storedTasks) {
        tasks = storedTasks || [];
    }

    function getTasks() {
        return [...tasks];
    }

    function getActiveTask() {
        if (!activeTaskId) return null;
        return tasks.find(t => t.id === activeTaskId) || null;
    }

    function addTask(text) {
        if (!text || !text.trim()) return null;

        const task = {
            id: Date.now().toString(),
            text: text.trim(),
            completed: false,
            pomodoros: 0,
            createdAt: Date.now()
        };

        tasks.unshift(task);
        save();
        notifyChange();
        return task;
    }

    function toggleTask(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        const wasCompleted = task.completed;
        task.completed = !task.completed;

        if (task.completed && !wasCompleted) {
            StorageManager.incrementCompletedTasks();
        }

        save();
        notifyChange();
        return task;
    }

    function deleteTask(id) {
        const index = tasks.findIndex(t => t.id === id);
        if (index === -1) return;

        if (activeTaskId === id) {
            activeTaskId = null;
        }

        tasks.splice(index, 1);
        save();
        notifyChange();
    }

    function incrementTaskPomodoros(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        task.pomodoros += 1;
        save();
        notifyChange();
        return task;
    }

    function setActiveTask(id) {
        activeTaskId = id;
        notifyChange();
    }

    function save() {
        StorageManager.saveTasks(tasks);
    }

    function notifyChange() {
        if (onTasksChangeCallback) {
            onTasksChangeCallback({
                tasks: [...tasks],
                activeTaskId,
                stats: getStats()
            });
        }
    }

    function getStats() {
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const totalPomodoros = tasks.reduce((sum, t) => sum + t.pomodoros, 0);
        return { total, completed, totalPomodoros };
    }

    function onTasksChange(callback) {
        onTasksChangeCallback = callback;
    }

    return {
        init,
        getTasks,
        getActiveTask,
        addTask,
        toggleTask,
        deleteTask,
        incrementTaskPomodoros,
        setActiveTask,
        getStats,
        onTasksChange
    };
})();
