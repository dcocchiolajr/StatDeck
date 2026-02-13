/**
 * Undo Manager
 * Manages undo/redo history
 */

class UndoManager {
    constructor(app) {
        this.app = app;
        this.history = [];
        this.currentIndex = -1;
        this.maxHistory = 50;
    }
    
    recordAction(type, data) {
        // Remove any actions after current index
        this.history = this.history.slice(0, this.currentIndex + 1);
        
        // Add new action
        this.history.push({
            type: type,
            data: JSON.parse(JSON.stringify(data)), // Deep clone
            timestamp: Date.now()
        });
        
        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.currentIndex++;
        }
        
        this.app.updateUI();
    }
    
    undo() {
        if (!this.canUndo()) return;
        
        const action = this.history[this.currentIndex];
        this.currentIndex--;
        
        // Apply undo logic (simplified - full implementation would restore state)
        console.log('Undo:', action);
        
        this.app.updateUI();
    }
    
    redo() {
        if (!this.canRedo()) return;
        
        this.currentIndex++;
        const action = this.history[this.currentIndex];
        
        // Apply redo logic
        console.log('Redo:', action);
        
        this.app.updateUI();
    }
    
    canUndo() {
        return this.currentIndex >= 0;
    }
    
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }
    
    clear() {
        this.history = [];
        this.currentIndex = -1;
        this.app.updateUI();
    }
}
