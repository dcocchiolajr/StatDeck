/**
 * Page Navigation Tiles - Pi Display
 * VERSION: v3.2
 * 
 * Two tile types: page_prev and page_next
 * Styles: arrow, text, icon, minimal
 * Full color/size customization like any other tile.
 * 
 * For now: renders visually. Page switching logic added later.
 */

class PagePrevTile extends BaseTile {
    constructor(config) {
        super(config);
        this.direction = 'prev';
        this.navStyle = this.style.navStyle || 'arrow';
        this.createContent();
    }

    createElement() {
        super.createElement();
        this.element.classList.add('page-nav-tile', 'page-prev-tile');
        this.element.style.cursor = 'pointer';
    }

    createContent() {
        const container = document.createElement('div');
        container.className = 'page-nav-content';
        container.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;gap:4px;user-select:none';

        const style = this.navStyle;
        const color = this.getValueColor() || 'currentColor';
        const label = this.tileConfig.label || '';

        if (style === 'text') {
            const text = document.createElement('div');
            text.className = 'page-nav-text';
            text.style.cssText = `font-size:1.2em;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:1px`;
            text.textContent = label || '◀ PREV';
            container.appendChild(text);
        } else if (style === 'icon') {
            const icon = document.createElement('div');
            icon.className = 'page-nav-icon';
            icon.style.cssText = `font-size:2.5em;color:${color};line-height:1`;
            icon.textContent = this.tileConfig.icon || '⬅️';
            container.appendChild(icon);
            if (label) {
                const lbl = document.createElement('div');
                lbl.className = 'page-nav-label';
                lbl.style.cssText = `font-size:0.7em;opacity:0.7;color:${this.getLabelColor() || color}`;
                lbl.textContent = label;
                container.appendChild(lbl);
            }
        } else if (style === 'minimal') {
            const arrow = document.createElement('div');
            arrow.style.cssText = `font-size:1.5em;font-weight:300;color:${color};opacity:0.6`;
            arrow.textContent = '‹';
            container.appendChild(arrow);
        } else {
            // Default: arrow
            const svg = this.createArrowSVG('left', color);
            container.appendChild(svg);
            if (label) {
                const lbl = document.createElement('div');
                lbl.className = 'page-nav-label';
                lbl.style.cssText = `font-size:0.7em;opacity:0.7;color:${this.getLabelColor() || color}`;
                lbl.textContent = label;
                container.appendChild(lbl);
            }
        }

        this.element.appendChild(container);
    }

    createArrowSVG(direction, color) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '48');
        svg.setAttribute('height', '48');
        svg.style.cssText = 'max-width:60%;max-height:60%';

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');

        if (direction === 'left') {
            path.setAttribute('d', 'M15 18l-6-6 6-6');
        } else {
            path.setAttribute('d', 'M9 18l6-6-6-6');
        }

        svg.appendChild(path);
        return svg;
    }

    updateData(statsData) {
        // Page nav tiles don't display stats — they're buttons
        // Future: could show current page number
    }
}


class PageNextTile extends BaseTile {
    constructor(config) {
        super(config);
        this.direction = 'next';
        this.navStyle = this.style.navStyle || 'arrow';
        this.createContent();
    }

    createElement() {
        super.createElement();
        this.element.classList.add('page-nav-tile', 'page-next-tile');
        this.element.style.cursor = 'pointer';
    }

    createContent() {
        const container = document.createElement('div');
        container.className = 'page-nav-content';
        container.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;gap:4px;user-select:none';

        const style = this.navStyle;
        const color = this.getValueColor() || 'currentColor';
        const label = this.tileConfig.label || '';

        if (style === 'text') {
            const text = document.createElement('div');
            text.className = 'page-nav-text';
            text.style.cssText = `font-size:1.2em;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:1px`;
            text.textContent = label || 'NEXT ▶';
            container.appendChild(text);
        } else if (style === 'icon') {
            const icon = document.createElement('div');
            icon.className = 'page-nav-icon';
            icon.style.cssText = `font-size:2.5em;color:${color};line-height:1`;
            icon.textContent = this.tileConfig.icon || '➡️';
            container.appendChild(icon);
            if (label) {
                const lbl = document.createElement('div');
                lbl.className = 'page-nav-label';
                lbl.style.cssText = `font-size:0.7em;opacity:0.7;color:${this.getLabelColor() || color}`;
                lbl.textContent = label;
                container.appendChild(lbl);
            }
        } else if (style === 'minimal') {
            const arrow = document.createElement('div');
            arrow.style.cssText = `font-size:1.5em;font-weight:300;color:${color};opacity:0.6`;
            arrow.textContent = '›';
            container.appendChild(arrow);
        } else {
            // Default: arrow
            const svg = PagePrevTile.prototype.createArrowSVG.call(this, 'right', color);
            container.appendChild(svg);
            if (label) {
                const lbl = document.createElement('div');
                lbl.className = 'page-nav-label';
                lbl.style.cssText = `font-size:0.7em;opacity:0.7;color:${this.getLabelColor() || color}`;
                lbl.textContent = label;
                container.appendChild(lbl);
            }
        }

        this.element.appendChild(container);
    }

    updateData(statsData) {
        // Page nav tiles don't display stats
    }
}
