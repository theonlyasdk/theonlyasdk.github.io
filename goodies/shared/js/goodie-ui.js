/**
 * Goodie Shared UI Framework & State Persistence Engine
 * Universal LocalStorage manager, FLIP Spring HUD Animator, Steppers, Modals & Sliders
 */

class GoodieStorage {
  /**
   * Loads saved settings from localStorage with default fallbacks
   * @param {string} storageKey 
   * @param {object} defaultSettings 
   * @returns {object}
   */
  static load(storageKey, defaultSettings = {}) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return { ...defaultSettings };
      const parsed = JSON.parse(raw);
      return { ...defaultSettings, ...parsed };
    } catch (err) {
      console.warn(`[GoodieStorage] Failed to load "${storageKey}", using defaults`, err);
      return { ...defaultSettings };
    }
  }

  /**
   * Saves updated settings to localStorage
   * @param {string} storageKey 
   * @param {object} settings 
   */
  static save(storageKey, settings) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch (err) {
      console.warn(`[GoodieStorage] Failed to save "${storageKey}"`, err);
    }
  }

  /**
   * Automatically synchronizes an individual property to storage on change
   * @param {string} storageKey 
   * @param {string} key 
   * @param {any} val 
   */
  static updateKey(storageKey, key, val) {
    const current = GoodieStorage.load(storageKey, {});
    current[key] = val;
    GoodieStorage.save(storageKey, current);
  }
}

class GoodieUI {
  /**
   * Binds quick previous/next stepper chevron buttons to a <select> element
   * @param {string} prevId 
   * @param {string} nextId 
   * @param {string} selectId 
   * @param {function} onChange 
   */
  static bindStepper(prevId, nextId, selectId, onChange) {
    const prevBtn = document.getElementById(prevId);
    const nextBtn = document.getElementById(nextId);
    const select = document.getElementById(selectId);

    if (!select) return;

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const opts = Array.from(select.options).filter(o => !o.disabled);
        const curIdx = opts.findIndex(o => o.value === select.value);
        const nextIdx = (curIdx - 1 + opts.length) % opts.length;
        select.value = opts[nextIdx].value;
        select.dispatchEvent(new Event('change'));
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const opts = Array.from(select.options).filter(o => !o.disabled);
        const curIdx = opts.findIndex(o => o.value === select.value);
        const nextIdx = (curIdx + 1) % opts.length;
        select.value = opts[nextIdx].value;
        select.dispatchEvent(new Event('change'));
      });
    }

    if (onChange) {
      select.addEventListener('change', (e) => onChange(e.target.value));
    }
  }

  /**
   * Binds an <input type="range"> slider to its value telemetry label and listener
   * @param {string} sliderId 
   * @param {string} labelId 
   * @param {function} formatFn 
   * @param {function} onChange 
   */
  static bindSlider(sliderId, labelId, formatFn, onChange) {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    if (!slider) return;

    const update = (fire = true) => {
      const val = parseFloat(slider.value);
      if (label && formatFn) {
        label.textContent = formatFn(val);
      }
      if (fire && onChange) {
        onChange(val);
      }
    };

    slider.addEventListener('input', () => update(true));
    update(false); // Initial render
  }

  /**
   * Binds a segmented button control group
   * @param {string} containerSelector 
   * @param {string} attrName 
   * @param {function} onChange 
   */
  static bindSegmented(containerSelector, attrName, onChange) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const btns = container.querySelectorAll('.seg-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.getAttribute(attrName);
        if (onChange) onChange(val);
      });
    });
  }

  /**
   * Sets up a linear scale FLIP modal
   * @param {object} options 
   */
  static setupModal({ modalId, openBtnId, closeBtnId }) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const modalContent = modal.querySelector('.modal-content');
    const modalInner = modal.querySelector('.modal-inner');
    const openBtn = document.getElementById(openBtnId);
    const closeBtn = document.getElementById(closeBtnId);
    let isTransitioning = false;

    const open = () => {
      if (isTransitioning) return;
      isTransitioning = true;
      modal.classList.add('show');
      modal.style.opacity = '1';
      modal.style.pointerEvents = 'auto';

      if (modalInner) {
        modalInner.style.opacity = '0';
        modalInner.style.transition = 'opacity 0.2s linear 0.12s';
      }

      const anim = modalContent ? modalContent.animate([
        { transform: 'scale(0)', opacity: 0, borderRadius: '32px' },
        { transform: 'scale(1)', opacity: 1, borderRadius: '18px' }
      ], {
        duration: 340,
        easing: 'linear',
        fill: 'forwards'
      }) : null;

      requestAnimationFrame(() => {
        if (modalInner) modalInner.style.opacity = '1';
      });

      if (anim) {
        anim.onfinish = () => {
          anim.cancel();
          modalContent.style.transform = 'scale(1)';
          modalContent.style.opacity = '1';
          if (modalInner) {
            modalInner.style.transition = '';
            modalInner.style.opacity = '';
          }
          isTransitioning = false;
        };
      } else {
        isTransitioning = false;
      }
    };

    const close = () => {
      if (isTransitioning || !modal.classList.contains('show')) return;
      isTransitioning = true;

      if (modalInner) {
        modalInner.style.transition = 'opacity 0.1s linear';
        modalInner.style.opacity = '0';
      }

      const modalFade = modal.animate([
        { opacity: 1 },
        { opacity: 0 }
      ], {
        duration: 240,
        easing: 'linear',
        fill: 'forwards'
      });

      const anim = modalContent ? modalContent.animate([
        { transform: 'scale(1)', opacity: 1, borderRadius: '18px' },
        { transform: 'scale(0)', opacity: 0, borderRadius: '32px' }
      ], {
        duration: 260,
        easing: 'linear',
        fill: 'forwards'
      }) : null;

      const finishClose = () => {
        modal.classList.remove('show');
        modal.style.opacity = '';
        modal.style.pointerEvents = '';
        if (modalContent) {
          modalContent.style.transform = '';
          modalContent.style.opacity = '';
        }
        if (anim) anim.cancel();
        modalFade.cancel();
        if (modalInner) {
          modalInner.style.transition = '';
          modalInner.style.opacity = '';
        }
        isTransitioning = false;
      };

      if (anim) anim.onfinish = finishClose;
      else modalFade.onfinish = finishClose;
    };

    if (openBtn) openBtn.addEventListener('click', (e) => { e.stopPropagation(); open(); });
    if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(); });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('show')) close();
    });

    return { open, close };
  }

  /**
   * Initializes iOS-style sliding pill indicator for all .seg-control elements
   */
  static initSegmentedIndicators() {
    const controls = document.querySelectorAll('.seg-control');
    controls.forEach(ctrl => {
      let indicator = ctrl.querySelector('.seg-indicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'seg-indicator';
        ctrl.prepend(indicator);
      }

      const updateIndicator = (activeBtn, animate = true) => {
        if (!activeBtn) {
          indicator.style.opacity = '0';
          return;
        }
        const ctrlRect = ctrl.getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();
        if (btnRect.width === 0 || btnRect.height === 0) return;

        const left = btnRect.left - ctrlRect.left;
        const top = btnRect.top - ctrlRect.top;
        const width = btnRect.width;
        const height = btnRect.height;

        if (!animate) {
          indicator.style.transition = 'none';
        } else {
          indicator.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1), width 0.28s cubic-bezier(0.32, 0.72, 0, 1), height 0.28s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.15s ease';
        }

        indicator.style.width = `${width}px`;
        indicator.style.height = `${height}px`;
        indicator.style.transform = `translate(${left}px, ${top}px)`;
        indicator.style.opacity = '1';
      };

      const activeBtn = ctrl.querySelector('.seg-btn.active');
      if (activeBtn) {
        requestAnimationFrame(() => updateIndicator(activeBtn, false));
      }

      ctrl.querySelectorAll('.seg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          ctrl.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          updateIndicator(btn, true);
        });
      });
    });
  }
}

// Auto initialize sliding indicator on DOMContentLoaded and resize
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    GoodieUI.initSegmentedIndicators();
  });
  window.addEventListener('resize', () => {
    GoodieUI.initSegmentedIndicators();
  });
}

// Attach to window for universal browser script loading
window.GoodieStorage = GoodieStorage;
window.GoodieUI = GoodieUI;
