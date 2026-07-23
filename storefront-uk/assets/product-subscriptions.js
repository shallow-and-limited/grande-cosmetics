if (!customElements.get('product-subscription')) {
  customElements.define(
    'product-subscription',
    class ProductSubscription extends HTMLElement {
      constructor() {
        super();
        
        this.init();

        this.addEventListener('change', (event) => {
          if (event.target.tagName !== 'INPUT') return;
          if (event.target.type !== 'radio') return;

          if (event.target === this.oneInput) {
            this.sellingPlan.setAttribute('disabled', 'disabled');

            this.oneInput
              .closest('.product__subscription')
              .classList.add(`active`);
            this.subInput
              .closest('.product__subscription')
              .classList.remove(`active`);
          } else if (event.target === this.subInput) {
            this.sellingPlan.removeAttribute('disabled');

            this.subInput
              .closest('.product__subscription')
              .classList.add(`active`);
            this.oneInput
              .closest('.product__subscription')
              .classList.remove(`active`);
          }
        });
      }

      init() {
        this.subInput = this.querySelector('[data-subscription-input]');
        this.oneInput = this.querySelector('[data-onetime-input]');
        this.sellingPlan = this.querySelector('[data-selling-plan]');
      }
    }
  );
}
