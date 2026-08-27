/**
 * Procedural-Terrain 1:1 Canonical iOS FLIP Modal Spring Sidebar Library
 * Dependencies: sidebar.css
 */
class Sidebar {
  constructor(options = {}) {
    this.sidebarEl = document.querySelector(options.sidebarSelector || '#left-hud, .left-hud-sidebar, .sidebar');
    this.collapseBtn = document.querySelector(options.collapseTriggerSelector || options.closeTriggerSelector || '#btn-collapse-hud, .hud-morph-btn, [data-dismiss="sidebar"], [data-toggle="sidebar"]');
    this.isTransitioning = false;
    this.isOpen = true;
    this.callbacks = {
      onOpen: options.onOpen || null,
      onClose: options.onClose || null,
      onToggle: options.onToggle || null
    };

    // Apple Spring Easing Curves
    this.IOS_SPRING_EXPAND_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
    this.IOS_SPRING_COLLAPSE_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

    this._init();
  }

  _init() {
    if (!this.sidebarEl) return;

    this.isOpen = !this.sidebarEl.classList.contains('collapsed');

    if (this.collapseBtn) {
      this.collapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });
    }

    this.sidebarEl.addEventListener('click', (e) => {
      if (this.sidebarEl.classList.contains('collapsed')) {
        this.expand();
      }
    });

    // Support any additional trigger buttons
    document.querySelectorAll('[data-toggle="sidebar"]').forEach(btn => {
      if (btn !== this.collapseBtn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggle();
        });
      }
    });

    document.querySelectorAll('[data-dismiss="sidebar"]').forEach(btn => {
      if (btn !== this.collapseBtn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.collapse();
        });
      }
    });
  }

  collapse() {
    const hudSidebar = this.sidebarEl;
    if (!hudSidebar || this.isTransitioning || hudSidebar.classList.contains('collapsed')) return;
    this.isTransitioning = true;
    hudSidebar.classList.add('animating');

    const fullW = hudSidebar.offsetWidth || 310;
    const fullH = hudSidebar.offsetHeight || (window.innerHeight - 32);

    // 1. Crossfade: Fade out all panel contents immediately (100ms)
    const innerElements = hudSidebar.querySelectorAll('.hud-title-row, .hud-section, .action-btn, .seg-control, .hud-group-title, .hud-top-actions > :not(#btn-collapse-hud):not([data-dismiss="sidebar"]):not(.hud-morph-btn)');
    innerElements.forEach(el => {
      el.style.transition = 'opacity 0.1s ease-out';
      el.style.opacity = '0';
    });

    // 2. Animate container physical dimensions down to button bounds (320ms dismissal)
    const anim = hudSidebar.animate([
      {
        width: `${fullW}px`,
        height: `${fullH}px`,
        borderRadius: '16px',
        padding: '1.1rem'
      },
      {
        width: '2.75rem',
        height: '2.75rem',
        borderRadius: '16px',
        padding: '0px'
      }
    ], {
      duration: 320,
      easing: this.IOS_SPRING_COLLAPSE_EASE,
      fill: 'forwards'
    });

    anim.onfinish = () => {
      hudSidebar.classList.add('collapsed');
      hudSidebar.classList.remove('animating');
      anim.cancel();
      innerElements.forEach(el => {
        el.style.transition = '';
        el.style.opacity = '';
      });
      this.isTransitioning = false;
      this.isOpen = false;
      if (this.callbacks.onClose) this.callbacks.onClose();
      if (this.callbacks.onToggle) this.callbacks.onToggle(false);
    };
  }

  expand() {
    const hudSidebar = this.sidebarEl;
    if (!hudSidebar || this.isTransitioning || !hudSidebar.classList.contains('collapsed')) return;
    this.isTransitioning = true;
    hudSidebar.classList.add('animating');

    const fullW = 310;
    const fullH = window.innerHeight - 32;

    // 1. Remove collapsed state and prep staged fade-in
    hudSidebar.classList.remove('collapsed');
    const innerElements = hudSidebar.querySelectorAll('.hud-title-row, .hud-section, .action-btn, .seg-control, .hud-group-title, .hud-top-actions > :not(#btn-collapse-hud):not([data-dismiss="sidebar"]):not(.hud-morph-btn)');
    innerElements.forEach(el => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.24s ease-out 0.16s';
    });

    // 2. Animate container physical bounds from button to full panel (460ms presentation)
    const anim = hudSidebar.animate([
      {
        width: '2.75rem',
        height: '2.75rem',
        borderRadius: '16px',
        padding: '0px'
      },
      {
        width: `${fullW}px`,
        height: `${fullH}px`,
        borderRadius: '16px',
        padding: '1.1rem'
      }
    ], {
      duration: 460,
      easing: this.IOS_SPRING_EXPAND_EASE,
      fill: 'forwards'
    });

    requestAnimationFrame(() => {
      innerElements.forEach(el => {
        el.style.opacity = '1';
      });
    });

    anim.onfinish = () => {
      hudSidebar.classList.remove('animating');
      anim.cancel();
      innerElements.forEach(el => {
        el.style.transition = '';
        el.style.opacity = '';
      });
      this.isTransitioning = false;
      this.isOpen = true;
      if (this.callbacks.onOpen) this.callbacks.onOpen();
      if (this.callbacks.onToggle) this.callbacks.onToggle(true);
    };
  }

  toggle() {
    if (this.sidebarEl && this.sidebarEl.classList.contains('collapsed')) {
      this.expand();
    } else {
      this.collapse();
    }
  }

  show() {
    this.expand();
  }

  hide() {
    this.collapse();
  }
}

// Attach to window and module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Sidebar;
} else {
  window.Sidebar = Sidebar;
}