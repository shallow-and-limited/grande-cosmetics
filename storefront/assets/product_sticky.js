class StickyProduct extends HTMLElement {
  constructor() {
    super();

    this.isStickyVisible = false;
  }

  connectedCallback() {
    document.addEventListener('scroll', this.update.bind(this));
    window.addEventListener('resize', this.update.bind(this));

    this.update();
  }

  disconnectedCallback() {
    document.removeEventListener('scroll', this.update.bind(this));
    window.removeEventListener('resize', this.update.bind(this));
  }

  update() {
    const productInfo = document.querySelector('.product-form__buttons');
    const rect = productInfo.getBoundingClientRect();
    const belowFold = rect.bottom < 0;

    if (belowFold && !this.isStickyVisible) {
      this.style.display = 'block';
      this.isStickyVisible = true;
    } else if (!belowFold && this.isStickyVisible) {
      this.style.display = 'none';
      this.isStickyVisible = false;
    }
  }
}

customElements.define('sticky-product', StickyProduct);
