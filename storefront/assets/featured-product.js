/**
 * featured-product.js
 *
 * Section-scoped counterpart to the PDP behaviour in main-product.min.js.
 *
 * main-product.min.js reaches across the whole document (sticky bar, URL
 * rewriting, `document.querySelector('[data-add-to-cart-btn]')`, …) because the
 * PDP only ever has one product on it. `featured-product.liquid` can appear any
 * number of times on a single page, so everything here resolves against the
 * section it lives in.
 *
 * It also registers scope-aware fallbacks for `<product-modal>` and
 * `<main-product__info-blocks>`. Those are normally defined by
 * main-product.min.js; the guards mean whichever file loads first wins, and both
 * implementations understand both sections' markup.
 */
(() => {
  'use strict';

  const SCOPE_SELECTOR = '[data-product-scope]';

  /** Nearest product section, falling back to the document. */
  const scopeOf = (el) => el.closest(SCOPE_SELECTOR) || document;

  /* ------------------------------------------------------------------ *
   * <featured-product-form>
   * ------------------------------------------------------------------ */

  class FeaturedProductForm extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;

      this.section = scopeOf(this);
      this.productUrl = this.dataset.productUrl;

      const data = this.readData();
      this.optionNames = data.options || [];
      this.variants = data.variants || [];

      this.form = this.querySelector('[data-add-to-cart-form]');
      this.submitButton = this.querySelector('[data-add-to-cart-btn]');
      this.variantIdInput = this.querySelector('[data-selected-variant-id]');
      this.variantSelect = this.querySelector('[data-variant-select]');

      this.addEventListener('click', this.onPickerInteraction);
      this.addEventListener('keyup', this.onPickerInteraction);

      if (this.form) this.form.addEventListener('submit', this.onSubmit.bind(this));

      this.updateLoyaltyPoints();
    }

    readData() {
      const script = this.querySelector('[data-featured-product-data]');
      if (!script) return {};
      try {
        return JSON.parse(script.textContent);
      } catch (e) {
        console.warn('featured-product: could not parse section data', e);
        return {};
      }
    }

    /* ---------------- selection ---------------- */

    onPickerInteraction = (event) => {
      if (event.type === 'keyup' && event.key !== 'Enter') return;

      const swatch = event.target.closest('[data-swatch]');
      if (swatch) {
        this.selectSwatch(swatch);
        this.applyVariant(this.currentVariant());
        return;
      }

      const option = event.target.closest('input[type="radio"][data-option], .tab');
      if (!option) return;

      // `<label class="tab">` clicks flip the associated radio; let that settle
      // before reading `:checked`.
      requestAnimationFrame(() => this.applyVariant(this.currentVariant()));
    };

    selectSwatch(swatch) {
      this.querySelectorAll('[data-swatch]').forEach((node) => {
        node.classList.remove('swatch--selected');
        node.removeAttribute('data-selected');
      });
      swatch.classList.add('swatch--selected');
      swatch.setAttribute('data-selected', '');

      const label = this.querySelector('[data-selected-color]');
      if (label) label.textContent = swatch.dataset.swatch;
    }

    /**
     * Reads the value currently picked for one product option. Option names can
     * contain quotes and spaces, so the elements are filtered in JS rather than
     * through an attribute selector.
     */
    selectedValueFor(name) {
      const swatches = this.querySelectorAll('[data-swatch]');
      for (const swatch of swatches) {
        if (swatch.dataset.option === name && swatch.hasAttribute('data-selected')) {
          return swatch.dataset.swatch;
        }
      }

      const radios = this.querySelectorAll('input[type="radio"][data-option]');
      for (const radio of radios) {
        if (radio.dataset.option === name && radio.checked) {
          return radio.dataset.optionTitle || radio.dataset.variantTitle;
        }
      }

      return null;
    }

    currentVariant() {
      const selected = this.optionNames.map((name) => this.selectedValueFor(name));

      // Products with only a default variant render no picker at all.
      if (selected.some((value) => value == null)) {
        const current = this.variantIdInput && this.variantIdInput.value;
        return this.variants.find((v) => String(v.id) === String(current)) || this.variants[0];
      }

      return this.variants.find(
        (variant) =>
          variant.options.length === selected.length &&
          variant.options.every((value, index) => value === selected[index])
      );
    }

    /* ---------------- rendering ---------------- */

    applyVariant(variant) {
      if (!variant) return;

      if (this.variantIdInput) this.variantIdInput.value = variant.id;
      this.syncSelects(variant);
      this.updateOptionLabels(variant);
      this.updatePrices(variant);
      this.updateSubscriptionPrices(variant);
      this.updateAvailability(variant);
      this.updateLoyaltyPoints();
      this.reloadMedia(variant);
    }

    syncSelects(variant) {
      this.querySelectorAll('.product-form__variants').forEach((select) => {
        select.value = variant.id;
      });

      // `[data-variant-select]` carries the id as text rather than as a value.
      if (this.variantSelect) {
        const index = Array.from(this.variantSelect.options).findIndex(
          (option) => option.textContent.trim() === String(variant.id)
        );
        if (index > -1) this.variantSelect.selectedIndex = index;
      }
    }

    updateOptionLabels(variant) {
      this.optionNames.forEach((name, index) => {
        const value = variant.options[index];
        this.querySelectorAll('[data-selected-option]').forEach((node) => {
          if (node.dataset.selectedOption === name) node.textContent = value;
        });
      });

      const colorLabel = this.querySelector('[data-selected-color]');
      const colorIndex = this.optionNames.findIndex((name) => /colou?r/i.test(name));
      if (colorLabel && colorIndex > -1) colorLabel.textContent = variant.options[colorIndex];
    }

    updatePrices(variant) {
      this.section.querySelectorAll('[data-price]').forEach((node) => {
        node.textContent = variant.price;
      });
      this.section.querySelectorAll('[data-compare-price]').forEach((node) => {
        node.textContent = variant.compare_at_price || '';
      });

      // The Regios discount app owns these containers; `--regular` has to stay in
      // the DOM even when the variant isn't on sale.
      this.section
        .querySelectorAll('.regios-dopp-generic-price-container')
        .forEach((container) => {
          const sale = container.querySelector('.regios-dopp-generic-price-item--sale');
          const regular = container.querySelector('.regios-dopp-generic-price-item--regular');
          if (sale) sale.textContent = variant.price;
          if (!regular) return;
          if (variant.compare_at_price) {
            regular.textContent = variant.compare_at_price;
            regular.style.display = '';
          } else {
            regular.textContent = '';
            regular.style.display = 'none';
          }
        });
    }

    /**
     * Only the subscription row is touched here. The one-time row's
     * `.product__subscription-price-value` wraps a Regios price container, which
     * `updatePrices` already refreshes in place.
     */
    updateSubscriptionPrices(variant) {
      const label = this.querySelector('.product__subscription-price-label');
      if (label) label.textContent = variant.selling_plan_price || 'N/A';

      const struck = this.querySelector('.product__subscription-price-value.strike');
      if (struck) struck.textContent = variant.price;
    }

    updateAvailability(variant) {
      if (!this.submitButton) return;

      this.submitButton.classList.toggle('add-to-cart__submit-btn--disabled', !variant.available);
      this.submitButton.toggleAttribute('disabled', !variant.available);

      this.querySelectorAll('.text-unavailable').forEach((node) => {
        node.style.display = variant.available ? 'none' : 'block';
      });
      this.querySelectorAll('.text-available').forEach((node) => {
        node.style.display = variant.available ? 'block' : 'none';
      });
    }

    updateLoyaltyPoints() {
      const target = this.section.querySelector('[data-lion-points-possible]');
      const price = this.section.querySelector('.regios-dopp-generic-price-item--sale');
      if (!target || !price) return;

      const amount = parseFloat(price.textContent.replace(/[^0-9.-]+/g, ''));
      if (!isNaN(amount)) target.textContent = Math.round(amount);
    }

    /**
     * Media slides are filtered server-side by `variant.option1`
     * (snippets/media-carousel.liquid), so images for a newly picked colour only
     * exist after a re-render. Refetch the product page and swap in the freshly
     * filtered markup — `<media-carousel>` re-upgrades and rebuilds its Swiper.
     */
    reloadMedia(variant) {
      const wrapper = this.section.querySelector('[data-product-slider]');
      if (!wrapper || !this.productUrl) return;

      const carousel = wrapper.querySelector('media-carousel');
      const rendered = carousel ? carousel.getAttribute('data-rendered-option1') : null;
      if (rendered !== null && variant.option1 != null && rendered === String(variant.option1)) {
        return;
      }

      // Latest click wins.
      if (this.mediaController) this.mediaController.abort();
      this.mediaController = new AbortController();

      const url = new URL(this.productUrl, window.location.origin);
      url.searchParams.set('variant', variant.id);

      wrapper.setAttribute('aria-busy', 'true');
      fetch(url.toString(), { signal: this.mediaController.signal })
        .then((response) => response.text())
        .then((text) => {
          const fresh = new DOMParser()
            .parseFromString(text, 'text/html')
            .querySelector('[data-product-slider]');
          if (fresh) wrapper.innerHTML = fresh.innerHTML;
        })
        .catch((error) => {
          if (error && error.name === 'AbortError') return;
          console.error('featured-product: media gallery reload failed', error);
        })
        .finally(() => wrapper.removeAttribute('aria-busy'));
    }

    /* ---------------- add to cart ---------------- */

    onSubmit(event) {
      event.preventDefault();
      if (this.submitButton && this.submitButton.hasAttribute('disabled')) return;

      const formData = new FormData(this.form);
      const item = {
        id: formData.get('id'),
        quantity: parseInt(formData.get('quantity'), 10) || 1,
        properties: {},
      };

      for (const [key, value] of formData.entries()) {
        if (key === 'selling_plan' && value !== '') item.selling_plan = value;

        const property = key.match(/^properties\[(.+?)\]$/);
        if (property) item.properties[property[1]] = value;
      }

      this.showError(false);
      this.submitButton.classList.add('loading');

      window
        .addToCart([item])
        .then((response) => {
          if (response && response.status) {
            this.showError(response.description || response.message);
            return;
          }

          // Matches main-product.min.js: refresh the drawer if the theme renders
          // one, otherwise stay put. Never navigate to /cart — `<cart-drawer>` is
          // gated behind `settings.cart_drawer_enabled` (layout/theme.liquid), so
          // a redirect fallback fires on every add whenever that setting is off.
          const cartDrawer = document.querySelector('cart-drawer');
          if (cartDrawer) cartDrawer.fullUpdate(true);
        })
        .catch((error) => console.error('featured-product: add to cart failed', error))
        .finally(() => this.submitButton.classList.remove('loading'));
    }

    showError(message) {
      const wrapper = this.querySelector('[data-cart-error-wrapper]');
      if (!wrapper) return;

      wrapper.toggleAttribute('hidden', !message);
      const target = wrapper.querySelector('.product-form__error-message') || wrapper;
      target.textContent = message || '';
    }
  }

  if (!customElements.get('featured-product-form')) {
    customElements.define('featured-product-form', FeaturedProductForm);
  }

  /* ------------------------------------------------------------------ *
   * <product-modal> — scope-aware fallback
   * ------------------------------------------------------------------ */

  if (!customElements.get('product-modal')) {
    const findModal = (trigger, id) => {
      const scope = scopeOf(trigger);
      return (
        scope.querySelector(`[data-product-modal="${id}"]`) ||
        document.querySelector(`[data-product-modal="${id}"]`)
      );
    };

    const closeModals = (from) => {
      const scope = from ? scopeOf(from) : document;
      scope.querySelectorAll('[data-product-modal]').forEach((modal) => modal.classList.remove('open'));
      scope
        .querySelectorAll('[data-product-modal-overlay]')
        .forEach((overlay) => overlay.classList.remove('open'));
      document.body.classList.remove('no-scroll');
    };

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-product-modal-trigger]');
      if (trigger) {
        const modal = findModal(trigger, trigger.dataset.productModalTrigger);
        if (!modal) return;
        modal.classList.add('open');
        const overlay = scopeOf(trigger).querySelector('[data-product-modal-overlay]');
        if (overlay) overlay.classList.add('open');
        document.body.classList.add('no-scroll');
        return;
      }

      const closer =
        event.target.closest('[data-modal-close]') ||
        event.target.closest('[data-product-modal-overlay]');
      if (closer) closeModals(closer);
    });

    customElements.define('product-modal', class ProductModal extends HTMLElement {});
  }

  /* ------------------------------------------------------------------ *
   * <main-product__info-blocks> — scope-aware fallback
   * ------------------------------------------------------------------ */

  if (!customElements.get('main-product__info-blocks')) {
    customElements.define(
      'main-product__info-blocks',
      class InfoAccordions extends HTMLElement {
        connectedCallback() {
          if (this.initialized) return;
          this.initialized = true;

          this.addEventListener('click', (event) => {
            const tab = event.target.closest('[data-tab]');
            if (!tab || !this.contains(tab)) return;

            const id = tab.dataset.tab;
            const accordion =
              this.querySelector(`[data-accordion="${id}"]`) ||
              scopeOf(this).querySelector(`[data-accordion="${id}"]`);
            if (accordion) accordion.classList.toggle('accordion--expanded');
          });
        }
      }
    );
  }
})();
