/**
 * CPU Graph Tile
 * Displays CPU usage as a line graph
 */

class CPUGraphTile extends BaseTile {
    constructor(config) {
        super(config);
        this.history = [];
        this.maxHistory = this.tileConfig.history_seconds || 60;
        this.chart = null;
        
        this.createChart();
    }
    
    createElement() {
        super.createElement();
        
        // Add header
        const header = document.createElement('div');
        header.className = 'tile-header';
        header.innerHTML = `<span class="tile-label">CPU Usage</span>`;
        this.element.appendChild(header);
        
        // Add chart container
        const container = document.createElement('div');
        container.className = 'chart-container';
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);
        this.element.appendChild(container);
        this.canvas = canvas;
    }
    
    createChart() {
        const ctx = this.canvas.getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'CPU %',
                    data: [],
                    borderColor: this.style.color || '#00ff88',
                    backgroundColor: this.tileConfig.fill_under ? 
                        (this.style.color || '#00ff88') + '33' : 'transparent',
                    fill: this.tileConfig.fill_under || false,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        min: 0,
                        max: 100,
                        ticks: {
                            color: '#666',
                            font: {
                                size: 10
                            }
                        },
                        grid: {
                            color: '#333'
                        }
                    }
                },
                animation: {
                    duration: 0
                }
            }
        });
    }
    
    updateData(statsData) {
        const value = this.getValue(statsData);
        if (value === null) return;
        
        // Add to history
        this.history.push(value);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        
        // Update chart
        this.chart.data.labels = this.history.map((_, i) => '');
        this.chart.data.datasets[0].data = this.history;
        this.chart.update();
    }
}
