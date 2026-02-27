/**
 * Network Graph Tile
 * Displays upload/download speeds as dual-line graph
 */

class NetworkGraphTile extends BaseTile {
    constructor(config) {
        super(config);
        this.uploadHistory = [];
        this.downloadHistory = [];
        this.maxHistory = this.tileConfig.history_seconds || 60;
        this.chart = null;
        
        this.createChart();
    }
    
    createElement() {
        super.createElement();
        
        // Add header
        const header = document.createElement('div');
        header.className = 'tile-header';
        header.innerHTML = `<span class="tile-label">Network</span>`;
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
                datasets: [
                    {
                        label: 'Download',
                        data: [],
                        borderColor: this.style.download_color || '#4ecdc4',
                        backgroundColor: 'transparent',
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 0
                    },
                    {
                        label: 'Upload',
                        data: [],
                        borderColor: this.style.upload_color || '#ff6b6b',
                        backgroundColor: 'transparent',
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: this.config.size.w >= 2,
                        position: 'top',
                        labels: {
                            color: '#aaa',
                            font: {
                                size: 10
                            },
                            boxWidth: 12
                        }
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        min: 0,
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
        const networkData = this.getValue(statsData);
        if (!networkData) return;
        
        // Add to history
        this.downloadHistory.push(networkData.download_speed / 1024 || 0); // Convert to MB/s
        this.uploadHistory.push(networkData.upload_speed / 1024 || 0);
        
        if (this.downloadHistory.length > this.maxHistory) {
            this.downloadHistory.shift();
            this.uploadHistory.shift();
        }
        
        // Update chart
        this.chart.data.labels = this.downloadHistory.map((_, i) => '');
        this.chart.data.datasets[0].data = this.downloadHistory;
        this.chart.data.datasets[1].data = this.uploadHistory;
        this.chart.update();
    }
}
