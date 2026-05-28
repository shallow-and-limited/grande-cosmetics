class CartDrawer extends HTMLElement {
  constructor() {
    super();

    // If url has cart=1 open by default
    if (window.location.search.includes('cart=1')) {
      this.open();
    }

    this.addEventListener(
      'keyup',
      (evt) => evt.code === 'Escape' && this.close()
    );
    this.querySelector('#CartDrawer-Overlay').addEventListener(
      'click',
      this.close.bind(this)
    );
    this.setHeaderCartIconAccessibility();
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('[data-cart-link]');
    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');
    cartLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.open(cartLink);
    });
    cartLink.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault();
        this.open(cartLink);
      }
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);

    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {
      this.classList.add('animate', 'active');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = document.getElementById('CartDrawer');
        const focusElement =
          this.querySelector('.drawer__container') ||
          this.querySelector('.drawer__close');

        if (containerToTrapFocusOn && focusElement) {
          trapFocus(containerToTrapFocusOn, focusElement);
        }
      },
      { once: true }
    );

    document.body.classList.add('overflow-hidden');
  }

  close() {
    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
  }

  renderContents(parsedState) {
    this.querySelector('.drawer__container').classList.contains('is-empty') &&
      this.querySelector('.drawer__container').classList.remove('is-empty');
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);
      sectionElement.innerHTML = this.getSectionInnerHTML(
        parsedState.sections[section.id],
        section.selector
      );
    });

    setTimeout(() => {
      this.querySelector('#CartDrawer-Overlay').addEventListener(
        'click',
        this.close.bind(this)
      );
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: 'cart-link',
        selector: '.header__icon-cart',
      },
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector);
  }

  fullUpdate() {
    return fetch(`${routes.cart_url}?section_id=cart-drawer`)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        this.innerHTML = html.querySelector('cart-drawer').innerHTML;
      });
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__content',
      },
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.cart-drawer__footer',
      },
      {
        id: 'cart-link',
        section: 'cart-link',
        selector: '.header__icon-cart',
      },
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);
