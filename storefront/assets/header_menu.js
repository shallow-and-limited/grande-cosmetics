/**
 * No longer useful, keeping it to simplify the `header-menu` element.
 *
 * @description DetailsDisclosure is a custom element that is used to toggle the visibility of a details element.
 *
 * @example
 * <details-disclosure>
 *   <details>
 *     <summary>Toggle</summary>
 *     <div>Content</div>
 *   </details>
 * </details-disclosure>
 */
class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelector('details');
    this.content =
      this.mainDetailsToggle.querySelector('summary').nextElementSibling;

    this.mainDetailsToggle.addEventListener('toggle', this.onToggle.bind(this));
  }

  onToggle() {
    if (!this.animations) this.animations = this.content.getAnimations();

    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.animations.forEach((animation) => animation.play());
    } else {
      this.animations.forEach((animation) => animation.cancel());
    }
  }

  close() {
    this.mainDetailsToggle.removeAttribute('open');
    this.mainDetailsToggle
      .querySelector('summary')
      .setAttribute('aria-expanded', false);
  }
}

customElements.define('details-disclosure', DetailsDisclosure);

class HeaderMenu extends DetailsDisclosure {
  constructor() {
    super();
    this.header = document.querySelector('.header');
    this.summary = this.mainDetailsToggle.querySelector('summary');
    this.content = this.mainDetailsToggle.querySelector('.mega-menu__content');

    this.addMenuEventListeners();

    document.addEventListener('focusin', this.onFocusChange.bind(this));
    document.addEventListener('click', this.onDocumentClick.bind(this));
  }

  addMenuEventListeners() {
    this.summary.addEventListener('mouseenter', this.onMouseEnter.bind(this));
    this.content.addEventListener('mouseenter', this.onMouseEnter.bind(this));
    this.summary.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.content.addEventListener('mouseleave', this.onMouseLeave.bind(this));

    document.querySelectorAll('.header-menu summary').forEach((menuItem) => {
      if (menuItem !== this.summary) {
        menuItem.addEventListener(
          'mouseenter',
          this.onOtherMenuItemHover.bind(this)
        );
        menuItem.addEventListener(
          'focusin',
          this.onOtherMenuItemHover.bind(this)
        );
      }
    });
  }

  onMouseEnter() {
    // Close all other open menus
    document.querySelectorAll('details[open]').forEach((details) => {
      if (details !== this.mainDetailsToggle) {
        details.removeAttribute('open');
        details.querySelector('summary').setAttribute('aria-expanded', false);
      }
    });

    if (!this.mainDetailsToggle.hasAttribute('open')) {
      this.mainDetailsToggle.setAttribute('open', '');
      this.summary.setAttribute('aria-expanded', true);
      this.onToggle();
    }
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
    }
  }

  onMouseLeave(event) {
    this.closeTimeout = setTimeout(() => {
      this.close();
      this.onToggle();
    }, 100);
  }

  onOtherMenuItemHover() {
    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.close();
      this.onToggle();
    }
  }

  onFocusChange(event) {
    if (!this.header.contains(event.target)) {
      this.close();
      this.onToggle();
    }
  }

  onDocumentClick(event) {
    if (!this.header.contains(event.target)) {
      this.close();
      this.onToggle();
    }
  }

  close() {
    super.close();
    this.onToggle();
  }

  onToggle() {
    if (!this.header) return;
    this.header.preventHide = this.mainDetailsToggle.open;

    if (
      document.documentElement.style.getPropertyValue(
        '--header-bottom-position-desktop'
      ) !== ''
    )
      return;

    document.documentElement.style.setProperty(
      '--header-bottom-position-desktop',
      `${Math.floor(this.header.getBoundingClientRect().bottom)}px`
    );
  }
}

customElements.define('header-menu', HeaderMenu);
