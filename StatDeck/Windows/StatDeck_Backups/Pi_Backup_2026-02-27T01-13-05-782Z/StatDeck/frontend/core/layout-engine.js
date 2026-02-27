/**
 * Layout Engine v3.2
 */
class LayoutEngine {
    constructor(gridConfig) {
        this.config = gridConfig;
        this.gridElement = document.getElementById('tile-grid');
    }
    apply() {
        var root = document.documentElement;
        var cols = this.config.cols || 4;
        var rows = this.config.rows || 3;
        var gap = this.config.gap || 10;
        root.style.setProperty('--grid-cols', cols);
        root.style.setProperty('--grid-rows', rows);
        this.gridElement.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
        this.gridElement.style.gridTemplateRows = 'repeat(' + rows + ', 1fr)';
        this.gridElement.style.gap = gap + 'px';
        var density = Math.max(cols, rows);
        var scale = density <= 3 ? 1.15 : density <= 4 ? 1.0 : density <= 5 ? 0.85 : density <= 6 ? 0.72 : density <= 7 ? 0.62 : 0.55;
        root.style.setProperty('--grid-font-scale', scale);
        console.log('Layout: ' + cols + 'x' + rows + ', density scale: ' + scale);
    }
}
