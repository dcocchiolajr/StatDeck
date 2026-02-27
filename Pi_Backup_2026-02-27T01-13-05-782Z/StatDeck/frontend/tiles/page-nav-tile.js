/**
 * Page Navigation Tiles - Pi Display
 * VERSION: v4.0 — Multi-Page Support
 * 
 * Two tile types: page_prev and page_next
 * Styles: arrow, text, icon, minimal
 * 
 * NEW in v4.0:
 *   - Shows current page indicator (e.g., "2/4") when pages > 1
 *   - Listens for 'pageChanged' event to update indicator
 *   - Tap action handled by app.js (prevPage/nextPage) — no USB round-trip
 */

class PagePrevTile extends BaseTile {
    constructor(config) {
        super(config);
        this.direction = 'prev';
        this.navStyle = this.style.navStyle || 'arrow';
        this.pageIndicator = null;
        this.createContent();
        this.listenForPageChanges();
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
            text.textContent = label || '\u25C0 PREV';
            container.appendChild(text);
        } else if (style === 'icon') {
            const icon = document.createElement('div');
            icon.className = 'page-nav-icon';
            icon.style.cssText = `font-size:2.5em;color:${color};line-height:1`;
            icon.textContent = this.tileConfig.icon || '\u2B05\uFE0F';
            container.appendChild(icon);
            if (label) {
                const lbl = document.createElement('div');
                lbl.className = 'page-nav-label';
                lbl.style.cssText = `font-size:0.7em;color:${this.getLabelColor() || color};opacity:0.8`;
                lbl.textContent = label;
                container.appendChild(lbl);
            }
        } else if (style === 'minimal') {
            const bracket = document.createElement('div');
            bracket.className = 'page-nav-minimal';
            bracket.style.cssText = `font-size:2.5em;color:${color};opacity:0.5;line-height:1;font-weight:300`;
            bracket.textContent = '\u2039';
            container.appendChild(bracket);
        } else {
            // Default: arrow (SVG chevron)
            const svg = this.createArrowSVG('left', color);
            container.appendChild(svg);
            if (label) {
                const lbl = document.createElement('div');
                lbl.className = 'page-nav-label';
                lbl.style.cssText = `font-size:0.7em;color:${this.getLabelColor() || color};opacity:0.8`;
                lbl.textContent = label;
                container.appendChild(lbl);
            }
        }

        // Page indicator element (hidden until pages > 1)
        this.pageIndicator = document.createElement('div');
        this.pageIndicator.className = 'page-nav-indicator';
        this.pageIndicator.style.cssText = `font-size:0.6em;color:${this.getLabelColor() || color};opacity:0.5;margin-top:2px;display:none`;
        container.appendChild(this.pageIndicator);

        this.element.appendChild(container);
    }

    createArrowSVG(direction, color) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '36');
        svg.setAttribute('height', '36');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '2.5');
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

    listenForPageChanges() {
        document.addEventListener('pageChanged', (e) => {
            // Safety: if this tile's element is no longer in the DOM, skip
            if (!this.element || !this.element.parentNode) return;
            
            const { pageIndex, pageCount } = e.detail;
            if (pageCount > 1 && this.pageIndicator) {
                this.pageIndicator.textContent = `${pageIndex + 1}/${pageCount}`;
                this.pageIndicator.style.display = '';
            } else if (this.pageIndicator) {
                this.pageIndicator.style.display = 'none';
            }
        });
    }

    updateData(statsData) {
        // Page nav tiles don't display stats — they're navigation buttons
    }
}


class PageNextTile extends BaseTile {
    constructor(config) {
        super(config);
        this.direction = 'next';
        this.navStyle = this.style.navStyle || 'arrow';
        this.pageIndicator = null;
        this.createContent();
        this.listenForPageChanges();
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
            text.textContent = label || 'NEXT \u25B6';
            container.appendChild(text);
        } else if (style === 'icon') {
            const icon = document.createElement('div');
            icon.className = 'page-nav-icon';
            icon.style.cssText = `font-size:2.5em;color:${color};line-height:1`;
            icon.textContent = this.tileConfig.icon || '\u27A1\uFE0F';
            container.appendChild(icon);
            if (label) {
                const lbl = document.createElement('div');
                lbl.className = 'page-nav-label';
                lbl.style.cssText = `font-size:0.7em;color:${this.getLabelColor() || color};opacity:0.8`;
                lbl.textContent = label;
                container.appendChild(lbl);
            }
        } else if (style === 'minimal') {
            const bracket = document.createElement('div');
            bracket.className = 'page-nav-minimal';
            bracket.style.cssText = `font-size:2.5em;color:${color};opacity:0.5;line-height:1;font-weight:300`;
            bracket.textContent = '\u203A';
            container.appendChild(bracket);
        } else {
            // Default: arrow (SVG chevron)
            const svg = this.createArrowSVG('right', color);
            container.appendChild(svg);
            if (label) {
                const lbl = document.createElement('div');
                lbl.className = 'page-nav-label';
                lbl.style.cssText = `font-size:0.7em;color:${this.getLabelColor() || color};opacity:0.8`;
                lbl.textContent = label;
                container.appendChild(lbl);
            }
        }

        // Page indicator
        this.pageIndicator = document.createElement('div');
        this.pageIndicator.className = 'page-nav-indicator';
        this.pageIndicator.style.cssText = `font-size:0.6em;color:${this.getLabelColor() || color};opacity:0.5;margin-top:2px;display:none`;
        container.appendChild(this.pageIndicator);

        this.element.appendChild(container);
    }

    createArrowSVG(direction, color) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '36');
        svg.setAttribute('height', '36');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '2.5');
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

    listenForPageChanges() {
        document.addEventListener('pageChanged', (e) => {
            // Safety: if this tile's element is no longer in the DOM, skip
            if (!this.element || !this.element.parentNode) return;
            
            const { pageIndex, pageCount } = e.detail;
            if (pageCount > 1 && this.pageIndicator) {
                this.pageIndicator.textContent = `${pageIndex + 1}/${pageCount}`;
                this.pageIndicator.style.display = '';
            } else if (this.pageIndicator) {
                this.pageIndicator.style.display = 'none';
            }
        });
    }

    updateData(statsData) {
        // Page nav tiles don't display stats — they're navigation buttons
    }
}
