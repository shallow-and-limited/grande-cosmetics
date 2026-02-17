function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

class SectionId {
  static #separator = '__';

  // for a qualified section id (e.g. 'template--22224696705326__main'), return just the section id (e.g. 'template--22224696705326')
  static parseId(qualifiedSectionId) {
    return qualifiedSectionId.split(SectionId.#separator)[0];
  }

  // for a qualified section id (e.g. 'template--22224696705326__main'), return just the section name (e.g. 'main')
  static parseSectionName(qualifiedSectionId) {
    return qualifiedSectionId.split(SectionId.#separator)[1];
  }

  // for a section id (e.g. 'template--22224696705326') and a section name (e.g. 'recommended-products'), return a qualified section id (e.g. 'template--22224696705326__recommended-products')
  static getIdForSection(sectionId, sectionName) {
    return `${sectionId}${SectionId.#separator}${sectionName}`;
  }
}

class HTMLUpdateUtility {
  /**
   * Used to swap an HTML node with a new node.
   * The new node is inserted as a previous sibling to the old node, the old node is hidden, and then the old node is removed.
   *
   * The function currently uses a double buffer approach, but this should be replaced by a view transition once it is more widely supported https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
   */
  static viewTransition(
    oldNode,
    newContent,
    preProcessCallbacks = [],
    postProcessCallbacks = []
  ) {
    preProcessCallbacks?.forEach((callback) => callback(newContent));

    const newNodeWrapper = document.createElement('div');
    HTMLUpdateUtility.setInnerHTML(newNodeWrapper, newContent.outerHTML);
    const newNode = newNodeWrapper.firstChild;

    // dedupe IDs
    const uniqueKey = Date.now();
    oldNode.querySelectorAll('[id], [form]').forEach((element) => {
      element.id && (element.id = `${element.id}-${uniqueKey}`);
      element.form &&
        element.setAttribute(
          'form',
          `${element.form.getAttribute('id')}-${uniqueKey}`
        );
    });

    oldNode.parentNode.insertBefore(newNode, oldNode);
    oldNode.style.display = 'none';

    postProcessCallbacks?.forEach((callback) => callback(newNode));

    setTimeout(() => oldNode.remove(), 500);
  }

  // Sets inner HTML and reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
  static setInnerHTML(element, html) {
    element.innerHTML = html;
    element.querySelectorAll('script').forEach((oldScriptTag) => {
      const newScriptTag = document.createElement('script');
      Array.from(oldScriptTag.attributes).forEach((attribute) => {
        newScriptTag.setAttribute(attribute.name, attribute.value);
      });
      newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
      oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
    });
  }

  static updateSourceFromDestination = (html, container, id) => {
    const source = html.getElementById(`${id}`);
    const destination = container.querySelector(`#${id}`);

    if (source && destination) {
      destination.innerHTML = source.innerHTML;

      if (source.classList.contains('hidden')) {
        destination.classList.add('hidden');
      } else {
        destination.classList.remove('hidden');
      }
    } else {
      const sources = html.querySelectorAll(`[id*="${id}"]`);

      sources.forEach((source) => {
        const destinations = this.querySelector(`#${source.id}`);

        if (source && destinations) {
          destinations.innerHTML = source.innerHTML;

          if (source.classList.contains('hidden')) {
            destinations.classList.add('hidden');
          } else {
            destinations.classList.remove('hidden');
          }
        }
      });
    }
  };
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute(
    'aria-expanded',
    summary.parentNode.hasAttribute('open')
  );

  if (summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute(
      'aria-expanded',
      !event.currentTarget.closest('details').hasAttribute('open')
    );
  });

  if (summary.closest('menu-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (
      event.target !== container &&
      event.target !== last &&
      event.target !== first
    )
      return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if (
      (event.target === container || event.target === first) &&
      event.shiftKey
    ) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();

  if (
    elementToFocus.tagName === 'INPUT' &&
    ['search', 'text', 'email', 'url'].includes(elementToFocus.type) &&
    elementToFocus.value
  ) {
    elementToFocus.setSelectionRange(0, elementToFocus.value.length);
  }
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(':focus-visible');
} catch (e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = [
    'ARROWUP',
    'ARROWDOWN',
    'ARROWLEFT',
    'ARROWRIGHT',
    'TAB',
    'ENTER',
    'SPACE',
    'ESCAPE',
    'HOME',
    'END',
    'PAGEUP',
    'PAGEDOWN',
  ];
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if (navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener(
    'focus',
    () => {
      if (currentFocusedElement)
        currentFocusedElement.classList.remove('focused');

      if (mouseClick) return;

      currentFocusedElement = document.activeElement;
      currentFocusedElement.classList.add('focused');
    },
    true
  );
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage(
      '{"event":"command","func":"' + 'pauseVideo' + '","args":""}',
      '*'
    );
  });
  document.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video').forEach((video) => video.pause());
  document.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });
    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(
      PUB_SUB_EVENTS.quantityUpdate,
      this.validateQtyRules.bind(this)
    );
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    if (event.target.name === 'plus') {
      if (
        parseInt(this.input.dataset.min) > parseInt(this.input.step) &&
        this.input.value == 0
      ) {
        this.input.value = this.input.dataset.min;
      } else {
        this.input.stepUp();
      }
    } else {
      this.input.stepDown();
    }

    if (previousValue !== this.input.value)
      this.input.dispatchEvent(this.changeEvent);

    if (
      this.input.dataset.min === previousValue &&
      event.target.name === 'minus'
    ) {
      this.input.value = parseInt(this.input.min);
    }
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle(
        'disabled',
        parseInt(value) <= parseInt(this.input.min)
      );
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle('disabled', value >= max);
    }
  }
}

customElements.define('quantity-input', QuantityInput);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return fn(...args);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: `application/${type}`,
    },
  };
}

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent('on' + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);

  for (var key in params) {
    var hiddenField = document.createElement('input');
    hiddenField.setAttribute('type', 'hidden');
    hiddenField.setAttribute('name', key);
    hiddenField.setAttribute('value', params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (
  country_domid,
  province_domid,
  options
) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(
    options['hideElement'] || province_domid
  );

  Shopify.addListener(
    this.countryEl,
    'change',
    Shopify.bind(this.countryHandler, this)
  );

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function () {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = '';
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  },
};

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.drawer = this.querySelector('.drawer');
    this.mainDetailsToggle = this.querySelector('details');
    this.overlay = this.querySelector('.drawer__overlay');

    this.close = this.querySelector('.drawer__close');

    this.addEventListener('keyup', this.onKeyUp.bind(this));

    if (this.mainDetailsToggle) {
      this.summary = this.mainDetailsToggle.querySelector('summary');
      this.summary.addEventListener('click', this.onSummaryClick.bind(this));
    }

    if (this.close) {
      this.close.addEventListener('click', this.closeMenuDrawer.bind(this));
    }

    if (this.overlay) {
      this.overlay.addEventListener('click', this.closeMenuDrawer.bind(this));
    }
  }

  onSummaryClick() {
    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.closeMenuDrawer(true);
    } else {
      this.openMenuDrawer();
    }

    if (window.matchMedia('(max-width: 990px)')) {
      document.documentElement.style.setProperty(
        '--viewport-height',
        `${window.innerHeight}px`
      );
    }
  }

  open(target) {
    this.openMenuDrawer(target);
  }

  close() {
    this.closeMenuDrawer();
  }

  openMenuDrawer(target) {
    setTimeout(() => {
      this.drawer.classList.add('drawer--opened');
      document.body.classList.add('overflow-hidden');
    });

    if (this.mainDetailsToggle) {
      this.summary.setAttribute('aria-expanded', true);
      trapFocus(this.mainDetailsToggle, this.summary);
    } else {
      trapFocus(this.drawer);

      if (target) {
        this.triggeringElement = target;
        this.triggeringElement.setAttribute('aria-expanded', true);
      }
    }
  }

  closeMenuDrawer(e) {
    if (e) {
      e.preventDefault();
    }

    setTimeout(() => {
      this.drawer.classList.remove('drawer--opened');
      document.body.classList.remove('overflow-hidden');
    });

    if (this.mainDetailsToggle) {
      setTimeout(() => {
        this.mainDetailsToggle.removeAttribute('open');
      }, 200);

      this.summary.setAttribute('aria-expanded', false);
      removeTrapFocus(this.summary);
    } else {
      if (this.triggeringElement) {
        removeTrapFocus(this.triggeringElement);
        this.triggeringElement.setAttribute('aria-expanded', false);
      } else {
        removeTrapFocus();
      }
    }

    document.body.classList.remove('overflow-hidden');
  }

  onKeyUp(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if (!openDetailsElement) return;

    this.closeMenuDrawer();
  }
}

customElements.define('menu-drawer', MenuDrawer);

class ModalDialog extends HTMLElement {
  constructor() {
    super();

    this.removeOnClose = this.dataset.removeOnClose === 'true';

    this.querySelector('[id^="ModalClose-"]').addEventListener(
      'click',
      this.hide.bind(this, false)
    );
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE') this.hide();
    });

    this.addEventListener('click', (event) => {
      if (event.target === this) this.hide();
    });
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    document.body.appendChild(this);
  }

  open(opener) {
    this.show(opener);
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    window.pauseAllMedia();

    const media = this.querySelector('deferred-media');

    if (media) {
      media.loadContent();
    }
  }

  hide() {
    document.body.classList.remove('overflow-hidden');
    document.body.dispatchEvent(new CustomEvent('modalClosed'));
    this.removeAttribute('open');
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();

    if (this.removeOnClose) {
      this.remove();
    }
  }
}
customElements.define('modal-dialog', ModalDialog);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button');

    if (!button) return;
    button.addEventListener('click', () => {
      const modal = document.querySelector(this.getAttribute('data-modal'));
      if (modal) modal.show(button);
    });
  }
}
customElements.define('modal-opener', ModalOpener);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();

    this.posterButton = this.querySelector('.media__poster');
    this.posterImage = this.querySelector('.media__poster-image');

    const autoplay = this.dataset.autoplay === 'true';

    if (this.posterButton) {
      this.posterButton.addEventListener('click', this.loadContent.bind(this));
    }

    if (this.posterImage) {
      this.posterImage.addEventListener('click', this.loadContent.bind(this));
    }

    if (autoplay) {
      this.loadContent(false);
    }
  }

  loadContent(focus = true) {
    //window.pauseAllMedia();

    if (!this.getAttribute('loaded')) {
      const content = document.createElement('div');
      content.appendChild(
        this.querySelector('template').content.firstElementChild.cloneNode(true)
      );

      const children = content.querySelectorAll('video, model-viewer, iframe');

      this.setAttribute('loaded', true);

      children.forEach((child, index) => {
        if(child.nodeName == 'VIDEO') {
          child.pause();
        }

        var appended = false;

        if (child.classList.contains('hidden--desktop')) {
          if (window.matchMedia('(max-width: 749px)').matches) {
            this.appendChild(child);
            appended = true;
          }
        } else if (child.classList.contains('hidden--mobile')) {
          if (window.matchMedia('(min-width: 750px)').matches) {
            this.appendChild(child);
            appended = true;
          }
        } else {
          this.appendChild(child);
          appended = true;

          console.log(child);
        }

        if (!appended) {
          return;
        }

        if (focus) child.focus();

        if (child.nodeName == 'VIDEO' && child.getAttribute('autoplay')) {
          child.play();
        }
      });

      content.remove();

      if (this.posterButton) {
        this.posterButton.remove();
      }

      if (this.posterImage) {
        this.posterImage.remove();
      }
    }
  }
}

customElements.define('deferred-media', DeferredMedia);

class SliderComponent extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const manualInit = this.dataset.manualInit == 'true';

    if (!manualInit) {
      this.init();
    }
  }

  init() {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    this.loop = this.dataset.loop == 'true';
    this.autoplay = this.dataset.autoplay == 'true';
    this.speed = this.dataset.speed || 5000;
    this.forcePaused = this.dataset.forcePaused == 'true';

    this.slider = this.querySelector(':scope > [id^="Slider-"]');
    this.buttons = this.querySelector(':scope > .slider-buttons');

    if (!this.slider) return;

    if (this.buttons) {
      this.prevButton = this.buttons.querySelector('button[name="prev"]');
      this.nextButton = this.buttons.querySelector('button[name="next"]');
      this.pauseButton = this.buttons.querySelector('.slider-button__toggle');
      this.dots = this.buttons.querySelector('.slider-counter');

      if (this.prevButton) {
        this.prevButton.addEventListener(
          'click',
          this.onButtonClick.bind(this)
        );
      }

      if (this.nextButton) {
        this.nextButton.addEventListener(
          'click',
          this.onButtonClick.bind(this)
        );
      }

      if (!this.autoplay && this.pauseButton) {
        this.pauseButton.remove();
      }
    }

    if (this.autoplay) {
      this.setAutoPlay();
    }

    const debouncedOnScroll = debounce((event) => {
      this.currentSlide = this.getCurrentSlideFromPosition();
      this.currentPage = this.getCurrentPage();

      this.setButtonsState();
      this.setDotsState();
    }, 50);

    this.slider.addEventListener('scroll', debouncedOnScroll.bind(this));

    const resizeObserver = new ResizeObserver((entries) => this.setupPages());
    resizeObserver.observe(this.slider);

    this.setupPages();
  }

  getCurrentSlideFromPosition() {
    return Math.floor(this.slider.scrollLeft / this.sliderItemWidth);
  }

  getCurrentPage() {
    return (
      Math.ceil(Math.abs(this.currentSlide) / this.slidesPerPage) %
      Math.ceil(this.totalPages)
    );
  }

  setupPages() {
    /*
     * Only check for visible slides since some may be hidden based on screen sizes.
     */
    this.sliderItems = this.slider.querySelectorAll(':scope > li');

    if(this.sliderItems.length == 0) {
      return;
    }

    this.sliderItemsToShow = Array.from(this.sliderItems).filter(
      (element) => element.clientWidth > 0
    );

    this.sliderItemsToShow.forEach((slide, index) => {
      slide.setAttribute('data-slide-index', index);
    });

    /**
     * Assume that each slide is the same width. Get the width of the first visible slide.
     *
     * Use this width to calculate the number of slides per page.
     */
    this.sliderItemWidth = this.sliderItemsToShow[0].offsetWidth;
    this.slidesPerPage = Math.floor(
      (this.slider.clientWidth - this.sliderItemsToShow[0].offsetLeft) /
        this.sliderItemWidth
    );

    /**
     * Calculate the total number of pages.
     *
     * If there are is only 1 page, hide the buttons.
     */
    this.totalSlides = this.sliderItemsToShow.length;
    this.totalPages = this.totalSlides / this.slidesPerPage;

    // TODO: Eventually allow for custom slide counts per page.
    this.step = this.slidesPerPage;//Math.ceil(this.slidesPerPage / this.totalPages);

    this.currentSlide = this.getCurrentSlideFromPosition();
    this.currentPage = Math.ceil(this.currentSlide / this.slidesPerPage);

    if (this.buttons) {
      if (this.totalPages <= 1) {
        this.buttons.classList.add('hidden');
      } else {
        this.buttons.classList.remove('hidden');
      }
    }

    if (this.loop) {
      this.nextSlideItemsToShow = this.sliderItemsToShow.slice();

      this.prevSlideItemsToShow = this.sliderItemsToShow.slice();
      this.prevSlideItemsToShow.reverse();

      this.maxSlides = this.totalSlides;
      this.minSlides = 0;
    }

    /**
     * Generate the dots if they exist.
     */
    this.generateDots();
    this.setButtonsState();
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll(':scope > [id^="Slide-"]');
    this.setupPages();
  }

  generateDots() {
    if (this.dots) {
      this.dots.innerHTML = '';

      for (let i = 0; i < this.totalPages; i++) {
        const dot = document.createElement('button');

        dot.classList.add('slider-counter__link');
        dot.classList.add('slider-counter__link--dots');
        dot.classList.add('link');

        if (i == 0) {
          dot.classList.add('slider-counter__link--active');
        }

        dot.setAttribute('data-slide-to', i);
        dot.setAttribute('aria-label', `Slide ${i + 1}`);
        dot.setAttribute('aria-controls', this.slider.id);

        dot.addEventListener('click', (event) => {
          const slideTo = event.currentTarget.getAttribute('data-slide-to');
          this.setPage(slideTo);
        });

        const span = document.createElement('span');
        span.classList.add('dot');

        dot.appendChild(span);

        this.dots.appendChild(dot);
      }
    }
  }

  update() {
    if (
      !this.slider ||
      !this.nextButton ||
      this.currentSlide == this.previousSlide
    ) {
      return;
    }

    this.currentPage =
      Math.ceil(Math.abs(this.currentSlide) / this.slidesPerPage) %
      Math.ceil(this.totalPages);

    if (this.loop) {
      /**
       * Handles infinite loop when navigating past the first or last slide.
       * Creates cloned slides at the beginning to maintain seamless scrolling.
       *
       * Steps:
       * 1. Extract slides to clone from their respective arrays
       * 2. Clone the DOM elements for these slides
       * 3. Mark clones with 'slider__slide--clone' class
       * 4. Set proper data-slide-index for each clone
       * 5. Insert clones at the beginning or end of the slider
       */

      if (this.currentSlide < this.minSlides) {
        // 1.
        const slidesToAdd = this.prevSlideItemsToShow.slice(0, this.step);
        this.prevSlideItemsToShow = this.prevSlideItemsToShow
          .slice(this.step)
          .concat(slidesToAdd);

        // 2.
        const clonedSlides = slidesToAdd.map((slide) => slide.cloneNode(true));

        // 3.
        clonedSlides.forEach((slide) =>
          slide.classList.add('slider__slide--clone')
        );

        // 4.
        clonedSlides.forEach((slide, index) => {
          slide.setAttribute(
            'data-slide-index',
            (this.previousSlide || 0) - index - 1
          );
        });

        // 5.
        this.slider.prepend(...clonedSlides.reverse());

        this.minSlides = this.currentSlide;
      } else if (this.currentSlide + this.slidesPerPage > this.maxSlides) {
        // 1.
        const slidesToAdd = this.nextSlideItemsToShow.slice(0, this.step);
        this.nextSlideItemsToShow = this.nextSlideItemsToShow
          .slice(this.step)
          .concat(slidesToAdd);

        // 2.
        const clonedSlides = slidesToAdd.map((slide) => slide.cloneNode(true));

        // 3.
        clonedSlides.forEach((slide) =>
          slide.classList.add('slider__slide--clone')
        );

        // 4.
        clonedSlides.forEach((slide, index) => {
          slide.setAttribute('data-slide-index', this.maxSlides + index);
        });

        // 5.
        this.slider.append(...clonedSlides);

        this.maxSlides = this.maxSlides + this.step;
      }
    } else {
      this.setButtonsState();
    }

    if (this.dots) {
      this.setDotsState();
    }

    const slideToShow = this.slider.querySelector(
      `[data-slide-index="${this.currentSlide}"]`
    );
    if (slideToShow) {
      this.slider.scrollLeft = slideToShow.offsetLeft;
    }

    this.dispatchEvent(
      new CustomEvent('slideChanged', {
        detail: {
          currentPage: this.currentPage,
          currentElement: this.sliderItemsToShow[this.currentSlide],
        },
      })
    );

    this.previousSlide = this.currentSlide;
  }

  setDotsState() {
    if (this.dots) {
      this.dots
        .querySelectorAll('.slider-counter__link')
        .forEach((dot, index) => {
          dot.classList.remove('slider-counter__link--active');
          if (index == this.currentPage) {
            dot.classList.add('slider-counter__link--active');
          }
        });
    }
  }

  setButtonsState() {
    if (!this.loop) {
      if (this.prevButton) {
        if (this.currentPage < 1) {
          this.prevButton.setAttribute('disabled', 'disabled');
        } else {
          this.prevButton.removeAttribute('disabled');
        }
      }

      if (this.nextButton) {
        if (this.currentPage >= (this.totalPages - 1)) {
          this.nextButton.setAttribute('disabled', 'disabled');
        } else {
          this.nextButton.removeAttribute('disabled');
        }
      }
    }
  }

  isSlideVisible(element, offset = 0) {
    const lastVisibleSlide =
      this.slider.clientWidth + this.slider.scrollLeft - offset;
    return (
      element.offsetLeft + element.clientWidth <= lastVisibleSlide &&
      element.offsetLeft >= this.slider.scrollLeft
    );
  }

  onButtonClick(event) {
    event.preventDefault();

    const direction = event.currentTarget.name;

    if (this.loop) {
      if (direction == 'next') {
        this.currentSlide += this.step;
      } else if (direction == 'prev') {
        this.currentSlide -= this.step;
      }
    } else {
      if (direction == 'next') {
        this.currentSlide += this.step;

        if (this.currentSlide >= this.totalSlides) {
          this.currentSlide = this.totalSlides - 1;
        }
      } else if (direction == 'prev') {
        this.currentSlide -= this.step;

        if (this.currentSlide < 0) {
          this.currentSlide = 0;
        }
      }
    }

    this.update();
  }

  setSlidePosition(slidePosition) {
    this.currentSlide = slidePosition;
    this.update();
  }

  setPage(page) {
    this.currentSlide = page * this.slidesPerPage;
    this.update();
  }

  setAutoPlay() {
    this.slider.setAttribute('aria-live', 'polite');
    this.slider.setAttribute('aria-atomic', 'true');

    this.addEventListener('mouseover', this.focusInHandling.bind(this));
    this.addEventListener('mouseleave', this.focusOutHandling.bind(this));
    this.addEventListener('focusin', this.focusInHandling.bind(this));
    this.addEventListener('focusout', this.focusOutHandling.bind(this));

    this.sliderAutoplayButton = this.querySelector('.slider-button__toggle');

    if (this.sliderAutoplayButton) {
      this.sliderAutoplayButton.addEventListener(
        'click',
        this.autoPlayToggle.bind(this)
      );

      this.play();
    } else {
      this.reducedMotion.matches ? this.pause() : this.play();
    }
  }

  autoPlayToggle() {
    if (this.forcePaused) {
      this.play();
      this.forcePaused = false;

      this.sliderAutoplayButton.setAttribute('data-pause', 'false');
      this.sliderAutoplayButton.setAttribute(
        'aria-label',
        window.accessibilityStrings.pauseSlideshow
      );
    } else {
      this.pause();
      this.forcePaused = true;

      this.sliderAutoplayButton.setAttribute('data-pause', 'true');
      this.sliderAutoplayButton.setAttribute(
        'aria-label',
        window.accessibilityStrings.playSlideshow
      );
    }
  }

  play() {
    this.slider.setAttribute('aria-live', 'off');

    clearInterval(this.autoplayInterval);

    this.autoplayInterval = setInterval(
      this.autoRotateSlides.bind(this),
      this.speed
    );
  }

  pause() {
    this.slider.setAttribute('aria-live', 'polite');
    clearInterval(this.autoplayInterval);
  }

  autoRotateSlides() {
    this.currentSlide += this.step;

    if (this.currentSlide >= this.totalSlides) {
      this.currentSlide = 0;
    }

    this.update();
  }

  focusOutHandling(event) {
    if (!this.forcePaused) {
      this.play();
    }
  }

  focusInHandling(event) {
    if (!this.forcePaused) {
      this.pause();
    }
  }
}

customElements.define('slider-component', SliderComponent);

class VariantSelects extends HTMLElement {
  constructor() {
    super();

    this.colorSwatches = this.querySelectorAll('.product-form__color');

    if (this.colorSwatches) {
      this.colorSwatches.forEach((swatch) => {
        swatch.addEventListener('mouseover', () => {
          const parent = swatch.closest('.product-form__input');
          const label = parent.querySelector('.product-form__label');

          const value = swatch.getAttribute('data-value');

          this.selectedValue = label.innerHTML;
          label.innerHTML = value;
        });

        swatch.addEventListener('mouseout', () => {
          const parent = swatch.closest('.product-form__input');
          const label = parent.querySelector('.product-form__label');

          label.innerHTML = this.selectedValue;
        });
      });
    }
  }

  connectedCallback() {
    this.addEventListener('change', (event) => {
      const target = this.getInputForEventTarget(event.target);
      this.updateSelectionMetadata(event);

      publish(PUB_SUB_EVENTS.optionValueSelectionChange, {
        data: {
          event,
          target,
          selectedOptionValues: this.selectedOptionValues,
        },
      });
    });
  }

  updateSelectionMetadata({ target }) {
    const { value, tagName } = target;

    if (tagName === 'SELECT' && target.selectedOptions.length) {
      Array.from(target.options)
        .find((option) => option.getAttribute('selected'))
        .removeAttribute('selected');
      target.selectedOptions[0].setAttribute('selected', 'selected');

      const swatchValue = target.selectedOptions[0].dataset.optionSwatchValue;
      const selectedDropdownSwatchValue = target
        .closest('.product-form__input')
        .querySelector('[data-selected-value] > .swatch');
      if (!selectedDropdownSwatchValue) return;
      if (swatchValue) {
        selectedDropdownSwatchValue.style.setProperty(
          '--swatch--background',
          swatchValue
        );
        selectedDropdownSwatchValue.classList.remove('swatch--unavailable');
      } else {
        selectedDropdownSwatchValue.style.setProperty(
          '--swatch--background',
          'unset'
        );
        selectedDropdownSwatchValue.classList.add('swatch--unavailable');
      }

      selectedDropdownSwatchValue.style.setProperty(
        '--swatch-focal-point',
        target.selectedOptions[0].dataset.optionSwatchFocalPoint || 'unset'
      );
    } else if (tagName === 'INPUT' && target.type === 'radio') {
      const selectedSwatchValue = target
        .closest(`.product-form__input`)
        .querySelector('[data-selected-value]');
      if (selectedSwatchValue) selectedSwatchValue.innerHTML = value;
    }
  }

  getInputForEventTarget(target) {
    return target.tagName === 'SELECT' ? target.selectedOptions[0] : target;
  }

  get selectedOptionValues() {
    return Array.from(
      this.querySelectorAll('select option[selected], fieldset input:checked')
    ).map(({ dataset }) => dataset.optionValueId);
  }
}

customElements.define('variant-selects', VariantSelects);

class ProductRecommendations extends HTMLElement {
  observer = undefined;

  constructor() {
    super();
  }

  connectedCallback() {
    this.initializeRecommendations();
  }

  initializeRecommendations(productId) {
    this.observer?.unobserve(this);
    this.observer = new IntersectionObserver(
      (entries, observer) => {
        if (!entries[0].isIntersecting) return;
        observer.unobserve(this);
        this.loadRecommendations();
      },
      { rootMargin: '0px 0px 400px 0px' }
    );
    this.observer.observe(this);
  }

  loadRecommendations() {
    fetch(`${this.dataset.url}`)
      .then((response) => response.text())
      .then((text) => {
        const html = document.createElement('div');
        html.innerHTML = text;
        const recommendations = html.querySelector('product-recommendations');

        if (recommendations?.innerHTML.trim().length) {
          this.innerHTML = recommendations.innerHTML;
        }

        if (html.querySelector('.grid__item')) {
          this.classList.add('product-recommendations--loaded');
        }

        if (
          typeof yotpoWidgetsContainer !== 'undefined' &&
          yotpoWidgetsContainer
        ) {
          setTimeout(() => {
            yotpoWidgetsContainer.initWidgets();
          }, 1000);
        }
      })
      .catch((e) => {
        console.error(e);
      });
  }
}

customElements.define('product-recommendations', ProductRecommendations);

class AccountIcon extends HTMLElement {
  constructor() {
    super();

    this.icon = this.querySelector('.icon');
  }

  connectedCallback() {
    document.addEventListener(
      'storefront:signincompleted',
      this.handleStorefrontSignInCompleted.bind(this)
    );
  }

  handleStorefrontSignInCompleted(event) {
    if (event?.detail?.avatar) {
      this.icon?.replaceWith(event.detail.avatar.cloneNode());
    }
  }
}

customElements.define('account-icon', AccountIcon);

class HoverComponent extends HTMLElement {
  constructor() {
    super();

    this.details = this.querySelector('details');
    this.summary = this.querySelector('summary');

    this.addEventListener('mouseover', this.handleMouseOver.bind(this));
    this.addEventListener('mouseleave', this.handleMouseLeave.bind(this));

    this.summary.addEventListener('click', this.handleSummaryClick.bind(this));
  }

  handleSummaryClick(e) {
    e.preventDefault();

    return false;
  }

  handleMouseOver() {
    this.details.setAttribute('open', '');
  }

  handleMouseLeave() {
    this.details.removeAttribute('open');
  }
}

customElements.define('hover-component', HoverComponent);

class ColorGroup extends HTMLElement {
  constructor() {
    super();

    this.groupId = this.dataset.groupId;

    if (this.groupId === undefined) {
      this.remove();
      return;
    }

    this.random = Math.floor(Math.random() * 1000000);
    this.cacheId = `${this.groupId}-${window.cacheModifier}`;

    this.reorderSwatches = this.dataset.reorderSwatches === 'true';
    this.limitSwatches = this.dataset.limitSwatches === 'true';
    this.small = this.dataset.small || window.innerWidth < 750 ? true : false;
    this.displayNumber =
      Math.floor(this.clientWidth / (this.small ? 30 : 50)) - 1;
    this.swatchCount = 0;

    if (!this.limitSwatches) {
      this.displayNumber = 999;
    }

    this.currentUrl = this.dataset.productUrl;
    this.currentProduct = this.dataset.productHandle;
    this.styleUrl = `${window.routes.group_collection}${this.groupId}`;

    this.slider = this.querySelector('.slider');
    this.container = this.querySelector('[color-swatches-container]');

    this.init();

    this.addEventListener('change', (event) => {
      const target = event.target;
      publish(PUB_SUB_EVENTS.swatchChange, target);
    });
  }

  init() {
    if (sessionStorage.getItem(this.cacheId) && this.limitSwatches) {
      const swatches = JSON.parse(sessionStorage.getItem(this.cacheId));

      if (this.slider) {
        this.slider.innerHTML = '';
      } else if (this.container) {
        this.container.innerHTML = '';
      } else {
        this.innerHTML = '';
      }

      for (const property in swatches) {
        var swatch = new DOMParser()
          .parseFromString(swatches[property], 'text/html')
          .querySelector('.swatch');

        this.setSwatches(swatch, swatch.dataset.id);
      }

      this.buildMoreSwatch(swatches);

      if (this.bindSwatches) {
        this.bindSwatches();
      }

      // Jank reset all inputs. A "real" fix would require a lot of work.
      this.querySelectorAll('.product__swatch input').forEach((node) => {
        node.checked = false;
      });
      for (var i = 0; i < 10; i++) {
        setTimeout(() => {
          this.querySelectorAll('.product__swatch input').forEach((node) => {
            node.checked = false;
          });
        }, i);
      }
    } else {
      fetch(`${this.styleUrl}?section_id=product_color-swatches`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(
            responseText,
            'text/html'
          );
          const swatches = html.querySelectorAll('.swatch');

          var swatchList = {};

          if (this.slider) {
            this.slider.innerHTML = '';
          } else if (this.container) {
            this.container.innerHTML = '';
          } else {
            this.innerHTML = '';
          }

          swatches.forEach((swatch, index) => {
            this.setSwatches(swatch, index);

            if (
              swatch.dataset.productHandle === this.currentProduct ||
              this.swatchCount <= this.displayNumber
            ) {
              swatchList[swatch.dataset.id] = swatch.outerHTML;
            }
          });

          sessionStorage.setItem(this.cacheId, JSON.stringify(swatchList));

          this.buildMoreSwatch(swatches);

          publish(PUB_SUB_EVENTS.swatchesLoaded, {
            data: this,
          });

          if (this.bindSwatches) {
            this.bindSwatches();
          }
        });
    }
  }

  setSwatches(swatch, id) {
    var label = swatch.querySelector('label');
    var input = swatch.querySelector('input');

    this.swatchTotal = swatch.dataset.swatchTotal;

    input.setAttribute(
      'name',
      `style-${this.sectionId}-${this.currentProduct}-${this.random}`
    );

    input.setAttribute(
      'id',
      `StyleSwatch-${this.sectionId}-${this.currentProduct}-${this.random}-${id}`
    );

    label.setAttribute(
      'for',
      `StyleSwatch-${this.sectionId}-${this.currentProduct}-${this.random}-${id}`
    );

    if (swatch.dataset.productHandle === this.currentProduct) {
      this.swatchCount++;

      this.addSwatch(swatch, id, true);

      this.defaultMedia = swatch.querySelector(`template[data-media='image']`);

      input.checked = true;
      input.setAttribute('checked', 'checked');
    } else if (this.swatchCount < this.displayNumber) {
      this.swatchCount++;
      this.addSwatch(swatch, id, false);
    }
  }

  addSwatch(swatch, id, isPrepend) {
    if (this.slider) {
      const li = document.createElement('li');
      li.classList.add('slider__slide');
      li.classList.add('grid__item');
      li.id = `Slide-${this.random}-${id}`;

      li.appendChild(swatch);

      if (this.reorderSwatches && isPrepend) {
        this.slider.prepend(li);
      } else {
        this.slider.appendChild(li);
      }
    } else if (this.container) {
      if (this.reorderSwatches && isPrepend) {
        this.container.prepend(swatch);
      } else {
        this.container.appendChild(swatch);
      }
    } else {
      if (this.reorderSwatches && isPrepend) {
        this.prepend(swatch);
      } else {
        this.appendChild(swatch);
      }
    }
  }

  buildMoreSwatch(swatches) {
    if (this.swatchCount > this.displayNumber) {
      var lastSwatch = this.querySelector('.swatch:last-child');
      lastSwatch.remove();
    }

    if (this.swatchTotal > this.displayNumber) {
      var div = document.createElement('div');
      div.classList.add('swatch');
      div.classList.add('swatch--more');
      div.innerHTML = `
        <quickview-trigger 
          class="link swatch__label swatch__label--more"
          data-product-handle="${this.currentProduct}"
          data-product-url="${this.currentUrl}"
        >
          +${this.swatchTotal - this.displayNumber}
        </quickview-trigger>
      `;

      this.appendChild(div);
    }
  }
}

customElements.define('color-group', ColorGroup);

class CardGroup extends ColorGroup {
  constructor() {
    super();

    this.card = this.closest('.card');

    this.imageContainer = this.card.querySelector('.card__image-container');
    this.cardLink = this.card.querySelector('.card__link');
    this.cardPrice = this.card.querySelector('.card__price');
  }

  handleSwatchChange(target) {
    if (!this.contains(target)) return;

    const swatch = target.closest('.swatch');

    // Change image
    const media = swatch.querySelector('template[data-media="image"]');

    this.imageContainer.innerHTML = '';
    this.imageContainer.appendChild(
      media.content.firstElementChild.cloneNode(true)
    );

    // Update link url
    this.cardLink.href = swatch.dataset.productUrl;

    // Update price
    if (this.cardPrice) {
      this.cardPrice.innerHTML = swatch.querySelector('.price').innerHTML;

      if (swatch.querySelector('.price').classList.contains('price--on-sale')) {
        this.cardPrice.classList.add('price--on-sale');
      } else {
        this.cardPrice.classList.remove('price--on-sale');
      }
    }

    // Update quickview trigger
    this.quickviews = this.card.querySelectorAll('quickview-trigger');

    if (this.quickviews) {
      this.quickviews.forEach((quickview) => {
        quickview.dataset.productHandle = swatch.dataset.productHandle;
        quickview.dataset.productUrl = swatch.dataset.productUrl;
      });
    }
  }

  connectedCallback() {
    this.onSwatchChangeUnsubscriber = subscribe(
      PUB_SUB_EVENTS.swatchChange,
      this.handleSwatchChange.bind(this)
    );
  }

  disconnectedCallback() {
    this.onSwatchChangeUnsubscriber();
  }
}

customElements.define('card-group', CardGroup);

class QuickviewGroupSwatches extends ColorGroup {
  constructor() {
    super();

    this.quickview = this.closest('.quickview');
  }
}

customElements.define('quickview-group', QuickviewGroupSwatches);

class ProductGroupSwatches extends ColorGroup {
  constructor() {
    super();
  }
}

customElements.define('product-group', ProductGroupSwatches);

class QuickviewTrigger extends HTMLElement {
  constructor() {
    super();

    this.productHandle = this.dataset.productHandle;
    this.productUrl = this.dataset.productUrl;

    this.addEventListener('click', this.openQuickview.bind(this));
  }

  openQuickview(e) {
    e.preventDefault();

    this.productHandle = this.dataset.productHandle;
    this.productUrl = this.dataset.productUrl;

    const quickview = document.querySelector('#Quickview');

    if (quickview) {
      quickview.remove();
    }

    const quickviewUrl = `${this.productUrl}${
      this.productUrl.includes('?') ? '&' : '?'
    }section_id=quickview`;

    fetch(quickviewUrl)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const quickviewModal = html.querySelector('#Quickview');

        if (quickviewModal) {
          document.body.appendChild(quickviewModal);
          quickviewModal.open(e.target);
        }
      });
  }
}

if (!customElements.get('quickview-trigger')) {
  customElements.define('quickview-trigger', QuickviewTrigger);
}

class QuickviewContainer extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.onVariantChangeUnsubscriber = subscribe(
      PUB_SUB_EVENTS.optionValueSelectionChange,
      this.handleOptionValueChange.bind(this)
    );

    this.onSwatchChangeUnsubscriber = subscribe(
      PUB_SUB_EVENTS.swatchChange,
      this.handleGroupSwatchChange.bind(this)
    );

    this.dispatchEvent(new CustomEvent('quickview:loaded', { bubbles: true }));
  }

  disconnectedCallback() {
    this.onVariantChangeUnsubscriber();
  }

  handleGroupSwatchChange(target) {
    if (!this.contains(target)) return;

    const swatch = target.closest('.swatch');

    const url = this.buildRequestUrl(swatch.dataset.productUrl);

    this.renderProductInfo({
      requestUrl: url,
      targetId: target.id,
      callback: this.handleUpdateProductInfo(),
    });
  }

  handleOptionValueChange({ data: { event, target, selectedOptionValues } }) {
    if (!this.contains(event.target)) return;

    const url = this.buildRequestUrl(
      this.dataset.productUrl,
      selectedOptionValues
    );

    this.renderProductInfo({
      requestUrl: url,
      targetId: target.id,
      callback: this.handleUpdateProductInfo(),
    });
  }

  buildRequestUrl(url, optionValues) {
    const params = [];

    params.push(`section_id=quickview`);

    if (optionValues && optionValues.length) {
      params.push(`option_values=${optionValues.join(',')}`);
    }

    return `${url}?${params.join('&')}`;
  }

  renderProductInfo({ requestUrl, targetId, callback }) {
    this.abortController?.abort();
    this.abortController = new AbortController();

    fetch(requestUrl, { signal: this.abortController.signal })
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');

        callback(html);
      })
      .then(() => {
        document.querySelector(`#${targetId}`)?.focus();
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          console.warn('Fetch aborted by user');
        } else {
          console.error(error);
        }
      });
  }

  handleUpdateProductInfo() {
    return (html) => {
      HTMLUpdateUtility.updateSourceFromDestination(
        html,
        this,
        'QuickviewProduct'
      );
      HTMLUpdateUtility.updateSourceFromDestination(
        html,
        this,
        'QuickviewSwatchesText'
      );
      HTMLUpdateUtility.updateSourceFromDestination(
        html,
        this,
        'QuickviewVariants'
      );
      HTMLUpdateUtility.updateSourceFromDestination(
        html,
        this,
        'QuickviewActions'
      );
    };
  }

  getSelectedVariant(html) {
    const selectedVariant =
      html.querySelector('variant-selects')?.dataset.selectedVariant;
    return !!selectedVariant ? selectedVariant : null;
  }
}

customElements.define('quickview-container', QuickviewContainer);
