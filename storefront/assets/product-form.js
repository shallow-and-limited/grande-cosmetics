if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.isBundle = this.dataset.bundleGifts === 'true';

        this.sectionId = this.dataset.sectionId;

        this.form = this.querySelector('form');
        this.variantIdInput.disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cart = document.querySelector('cart-drawer');
        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton.querySelector('span');

        if (document.querySelector('cart-drawer'))
          this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading__spinner').classList.remove('hidden');

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            'sections',
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append('sections_url', window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        } else {
          formData.append('sections_url', window.location.pathname);
          formData.append('sections', ['cart-icon-bubble']);
        }

        let productId = formData.get('id');

        if (this.isBundle) {
          let product_data = JSON.parse(this.dataset.bundle);

          product_data.forEach((item, index) => {
            if (item.id == productId) {
              formData.append(
                `properties[_bundleSize]`,
                item.properties._bundleSize
              );
              formData.append(
                `properties[_bundleGift]`,
                item.properties._bundleGift
              );
              formData.append(`properties[_gui]`, item.properties._gui);
            } else {
              formData.append(`items[${index}][id]`, item.id);
              formData.append(`items[${index}][quantity]`, item.quantity);
              formData.append(
                `items[${index}]properties[_gui]`,
                item.properties._gui
              );
              formData.append(
                `items[${index}]properties[_bundleSize]`,
                item.properties._bundleSize
              );
              if (item.properties._bundleGift) {
                formData.append(
                  `items[${index}]properties[_bundleGift]`,
                  item.properties._bundleGift
                );
              }
            }
          });
        }

        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (this.sectionId == 'Quickview') {
              document.querySelector('#Quickview').remove();
            }

            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              const soldOutMessage =
                this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButtonText.classList.add('hidden');
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            }

            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              });
            this.error = false;

            if (this.cart) {
              this.cart.renderContents(response);
            } else {
              const cartBubble = document.querySelector('#cart-icon-bubble');

              if (window.cartStrings.pulsate) {
                cartBubble.classList.add('pulsate');

                setTimeout(() => {
                  cartBubble.classList.remove('pulsate');
                }, 3000);
              }

              if (response.sections['cart-icon-bubble']) {
                const html = new DOMParser().parseFromString(
                  response.sections['cart-icon-bubble'],
                  'text/html'
                );
                cartBubble.querySelector(
                  '.cart-count-bubble__count'
                ).innerHTML = html.querySelector(
                  '.cart-count-bubble__count'
                ).innerHTML;
              }
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cart && this.cart.classList.contains('is-empty'))
              this.cart.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');
            this.querySelector('.loading__spinner').classList.add('hidden');
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper ||
          this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage =
          this.errorMessage ||
          this.errorMessageWrapper.querySelector(
            '.product-form__error-message'
          );

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      get variantIdInput() {
        return this.form.querySelector('[name=id]');
      }
    }
  );
}

if (!customElements.get('bundle-select')) {
  customElements.define(
    'bundle-select',
    class BundleSelect extends HTMLElement {
      constructor() {
        super();

        this.sku = this.querySelector('.bundle__sku');
        this.name = this.querySelector('.bundle__name');

        this.dropdown = this.querySelector('.product__bundle-product-select');

        if (this.dropdown) {
          this.dropdown.addEventListener(
            'change',
            this.onChangeHandler.bind(this)
          );
        }
      }

      onChangeHandler(evt) {
        this.sku.value = evt.target.value;
        this.name.value = evt.target.selectedOptions[0].dataset.name;
      }
    }
  );
}
