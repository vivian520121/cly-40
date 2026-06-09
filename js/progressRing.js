const ProgressRing = (function() {
    const RADIUS = 120;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
    
    let progressElement = null;

    function init(element) {
        progressElement = element;
        progressElement.style.strokeDasharray = CIRCUMFERENCE;
        progressElement.style.strokeDashoffset = '0';
    }

    function update(remaining, total) {
        if (!progressElement) return;
        
        const progress = total > 0 ? remaining / total : 0;
        const offset = CIRCUMFERENCE * (1 - progress);
        
        progressElement.style.strokeDashoffset = offset.toString();
    }

    function reset() {
        if (!progressElement) return;
        progressElement.style.strokeDashoffset = '0';
    }

    function setColor(color) {
        if (!progressElement) return;
        progressElement.style.stroke = color;
    }

    return {
        init,
        update,
        reset,
        setColor
    };
})();
