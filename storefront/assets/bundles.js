/**
 * <bundle-builder> — "Build Your Own Bundle" kit picker.
 *
 * Ported from the Lilly Lashes theme onto this theme's cart plumbing:
 *  - adds via the global `window.addToCart()` from global.min.js (same call the
 *    PDP and product cards use) instead of Dawn's product-form fetch
 *  - refreshes <cart-drawer> with fullUpdate(true) when the drawer is enabled,
 *    otherwise falls back to the cart page
 *
 * Every kit lives in its own [data-bundle-panel]. All lookups are scoped to that
 * panel, so merchant-entered bundle IDs never end up inside a CSS selector.
 */
if (!customElements.get('bundle-builder')) {
  customElements.define(
    'bundle-builder',
    class BundleBuilder extends HTMLElement {
      connectedCallback() {
        if (this.initialized) return;
        this.initialized = true;

        this.kitConfigs = this.parseData().kits || [];

        // A single selection shared across kits, cleared when the kit changes —
        // one bundle is checked out at a time.
        this.productList = [];
        this.appliedFilters = {};

        this.tabs = Array.from(this.querySelectorAll('[data-bundle-tab]'));
        this.kits = Array.from(this.querySelectorAll('[data-bundle-panel]')).map(
          this.buildKit.bind(this)
        );

        if (!this.kits.length) return;

        this.currentKit = this.kits[0];

        this.kits.forEach((kit) => {
          if (kit.tab) {
            kit.tab.addEventListener('click', () => this.selectKit(kit));
            kit.tab.addEventListener('keydown', (event) =>
              this.onTabKeydown(event, kit)
            );
          }

          kit.filterForms.forEach((form) => {
            form.addEventListener('change', () => this.onFilterChange(kit));
            // The forms only exist to group the checkboxes — never navigate.
            form.addEventListener('submit', (event) => event.preventDefault());
          });

          kit.addButtons.forEach((button) => {
            button.addEventListener('click', () => this.addProduct(button));
          });

          if (kit.summaryToggle) {
            kit.summaryToggle.addEventListener('click', (event) =>
              this.toggleSummary(event, kit)
            );
          }

          if (kit.checkoutButton) {
            kit.checkoutButton.addEventListener('click', () =>
              this.submitKit(kit)
            );
          }
        });

        // Both the filter accordions and the summary are collapsible on mobile
        // only — their toggles are display:none on desktop. Track the viewport so
        // a resize can't leave either one collapsed and unopenable.
        this.desktop = window.matchMedia('(min-width: 1024px)');
        this.desktop.addEventListener('change', () => this.syncViewport());
        this.syncViewport();

        this.update();
      }

      /**
       * Filters render open (the desktop state, since their toggles are hidden)
       * and the summary renders closed (docked at the bottom of the viewport).
       */
      syncViewport() {
        const isDesktop = this.desktop.matches;

        this.kits.forEach((kit) => {
          kit.filterContainers.forEach((container) => {
            container.toggleAttribute('open', isDesktop);
          });

          if (kit.summary) {
            kit.summary.classList.remove('bundle-summary--open');
          }

          if (kit.summaryToggle) {
            if (isDesktop) {
              kit.summaryToggle.removeAttribute('aria-expanded');
            } else {
              kit.summaryToggle.setAttribute('aria-expanded', 'false');
            }
          }
        });
      }

      parseData() {
        const script = this.querySelector('[data-bundle-data]');
        if (!script) return {};

        try {
          return JSON.parse(script.textContent);
        } catch (error) {
          console.error('[bundle-builder] could not parse bundle data', error);
          return {};
        }
      }

      buildKit(panel, index) {
        const id = panel.dataset.kitId;
        const config = this.kitConfigs.find((kit) => kit.id === id) || {};

        return {
          id,
          index,
          panel,
          tab: this.tabs[index] || null,
          size: Math.max(parseInt(config.size, 10) || 1, 1),
          type: config.type || '',
          progressIncomplete: config.progress_incomplete || '',
          progressComplete: config.progress_complete || '',
          products: Array.from(panel.querySelectorAll('[data-bundle-product]')),
          empty: panel.querySelector('[data-bundle-empty]'),
          summary: panel.querySelector('[data-bundle-summary]'),
          summaryToggle: panel.querySelector('[data-bundle-summary-toggle]'),
          summaryList: panel.querySelector('[data-bundle-summary-list]'),
          progressBar: panel.querySelector('[data-bundle-progress-bar] span'),
          progressContent: panel.querySelector('[data-bundle-progress-content]'),
          checkoutButton: panel.querySelector('[data-bundle-checkout]'),
          error: panel.querySelector('[data-bundle-error]'),
          filterForms: Array.from(
            panel.querySelectorAll('[data-bundle-filter-form]')
          ),
          filterContainers: Array.from(
            panel.querySelectorAll('[data-bundle-filter-container]')
          ),
          addButtons: Array.from(panel.querySelectorAll('[data-bundle-add]')),
        };
      }

      /* ----------------------------------------------------------- tabs */

      selectKit(kit) {
        if (kit === this.currentKit) return;

        this.currentKit = kit;
        this.productList = [];
        this.appliedFilters = {};

        this.kits.forEach((other) => {
          const selected = other === kit;

          other.panel.classList.toggle('bundle--hidden', !selected);

          if (other.tab) {
            other.tab.setAttribute('aria-selected', selected ? 'true' : 'false');
            other.tab.classList.toggle('tab--selected', selected);
            other.tab.tabIndex = selected ? 0 : -1;
          }

          // Leaving a kit clears its filters so it comes back unfiltered.
          other.filterForms.forEach((form) => form.reset());
        });

        if (kit.tab) kit.tab.focus();

        this.update();
      }

      onTabKeydown(event, kit) {
        const keys = {
          ArrowLeft: -1,
          ArrowUp: -1,
          ArrowRight: 1,
          ArrowDown: 1,
        };

        let target;

        if (keys[event.key]) {
          const next = kit.index + keys[event.key];
          target = this.kits[(next + this.kits.length) % this.kits.length];
        } else if (event.key === 'Home') {
          target = this.kits[0];
        } else if (event.key === 'End') {
          target = this.kits[this.kits.length - 1];
        }

        if (!target) return;

        event.preventDefault();
        this.selectKit(target);
      }

      /* -------------------------------------------------------- filters */

      onFilterChange(kit) {
        this.appliedFilters = {};

        kit.filterForms.forEach((form) => {
          form
            .querySelectorAll('input[type="checkbox"]:checked')
            .forEach((input) => {
              const key = input.dataset.filterKey || input.name;
              if (!key) return;

              if (!this.appliedFilters[key]) this.appliedFilters[key] = [];
              this.appliedFilters[key].push(input.value);
            });
        });

        this.update();
      }

      matchesFilters(product) {
        return Object.keys(this.appliedFilters).every((key) => {
          const selected = this.appliedFilters[key];

          if (key === 'product-type') {
            return selected.includes(product.dataset.type);
          }

          if (key === 'variant-option') {
            const options = (product.dataset.options || '').split(',');
            return options.some((option) =>
              selected.some((value) => option.includes(value))
            );
          }

          const attribute = product.getAttribute(`data-${key}`);
          if (!attribute) return false;

          return attribute.split(',').some((value) => selected.includes(value));
        });
      }

      /* ------------------------------------------------------- rendering */

      update() {
        const kit = this.currentKit;
        if (!kit) return;

        let visible = 0;

        kit.products.forEach((product) => {
          const matches = this.matchesFilters(product);
          product.classList.toggle('bundle--hidden', !matches);
          if (matches) visible += 1;
        });

        if (kit.empty) {
          kit.empty.classList.toggle('bundle--hidden', visible > 0);
        }

        this.renderSummary(kit);
        this.renderProgress(kit);
      }

      renderSummary(kit) {
        if (!kit.summaryList) return;

        const removeLabel = kit.summaryList.dataset.removeLabel || 'Remove';

        kit.summaryList.innerHTML = '';

        // Built with DOM nodes rather than innerHTML so product titles and image
        // URLs are never parsed as markup.
        this.productList.forEach((product) => {
          const item = document.createElement('li');
          item.className = 'bundle-summary__product';

          const imageWrapper = document.createElement('div');
          imageWrapper.className = 'bundle-summary__product-image';

          const image = document.createElement('img');
          image.src = product.image || '';
          image.alt = '';
          image.width = 70;
          image.height = 70;
          image.loading = 'lazy';
          imageWrapper.appendChild(image);

          const info = document.createElement('div');
          info.className = 'bundle-summary__product-info';

          const title = document.createElement('div');
          title.className = 'bundle-summary__product-title p-4 w-bold';
          title.textContent = `${product.title} x ${product.quantity}`;

          const removeButton = document.createElement('button');
          removeButton.type = 'button';
          removeButton.className =
            'bundle-summary__product-action p-5 underline';
          removeButton.textContent = removeLabel;
          removeButton.addEventListener('click', () =>
            this.removeProduct(product.id)
          );

          info.append(title, removeButton);
          item.append(imageWrapper, info);
          kit.summaryList.appendChild(item);
        });
      }

      renderProgress(kit) {
        const count = Math.min(this.selectedCount(), kit.size);

        if (kit.progressBar) {
          kit.progressBar.style.width = `${(count / kit.size) * 100}%`;
        }

        const complete = count >= kit.size;

        if (kit.progressContent) {
          kit.progressContent.innerHTML = complete
            ? kit.progressComplete
            : kit.progressIncomplete
                .replace(/\|number\|/g, kit.size - count)
                .replace(/\|type\|/g, kit.type);
        }

        if (kit.checkoutButton) {
          kit.checkoutButton.disabled = !complete;
        }
      }

      selectedCount() {
        return this.productList.reduce(
          (total, product) => total + product.quantity,
          0
        );
      }

      /* ------------------------------------------------------- selection */

      addProduct(button) {
        const id = button.dataset.variantId;
        if (!id) return;

        const existing = this.productList.find((product) => product.id === id);

        if (existing) {
          existing.quantity += 1;
        } else {
          this.productList.push({
            id,
            image: button.dataset.variantImage,
            title: button.dataset.variantTitle,
            quantity: 1,
          });
        }

        this.update();
      }

      removeProduct(id) {
        const product = this.productList.find((item) => item.id === id);
        if (!product) return;

        if (product.quantity > 1) {
          product.quantity -= 1;
        } else {
          this.productList = this.productList.filter((item) => item.id !== id);
        }

        this.update();
      }

      toggleSummary(event, kit) {
        if (!kit.summary) return;

        event.preventDefault();

        const open = kit.summary.classList.toggle('bundle-summary--open');
        kit.summaryToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      }

      /* ------------------------------------------------------ add to cart */

      submitKit(kit) {
        if (!this.productList.length) return;

        kit.checkoutButton.disabled = true;
        this.hideError(kit);

        const items = this.productList.map((product) => ({
          id: product.id,
          quantity: product.quantity,
          properties: { _kit: kit.id },
        }));

        this.addToCart(items)
          .then((response) => {
            if (!response) {
              throw new Error(
                (window.cartStrings && window.cartStrings.error) ||
                  'Could not add this bundle to your cart.'
              );
            }

            if (response.status) {
              throw new Error(response.description || response.message);
            }

            if (
              typeof publish === 'function' &&
              typeof PUB_SUB_EVENTS !== 'undefined'
            ) {
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'bundle-builder',
                cartData: response,
              });
            }

            const cartDrawer = document.querySelector('cart-drawer');

            if (cartDrawer && typeof cartDrawer.fullUpdate === 'function') {
              this.productList = [];
              this.update();
              cartDrawer.fullUpdate(true);
            } else {
              window.location = this.cartUrl();
            }
          })
          .catch((error) => {
            console.error(error);
            this.showError(kit, error.message);
          })
          .finally(() => {
            kit.checkoutButton.disabled = this.selectedCount() < kit.size;
          });
      }

      addToCart(items) {
        // global.min.js exposes addToCart() and dispatches `cartUpdated` for us.
        if (typeof window.addToCart === 'function') {
          return window.addToCart(items);
        }

        return fetch(`${this.routeRoot()}cart/add.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        }).then((response) => response.json());
      }

      routeRoot() {
        const root =
          (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) ||
          '/';

        return root.endsWith('/') ? root : `${root}/`;
      }

      cartUrl() {
        return (
          (window.routes && window.routes.cart_url) || `${this.routeRoot()}cart`
        );
      }

      showError(kit, message) {
        if (!kit.error) return;

        kit.error.textContent =
          message ||
          (window.cartStrings && window.cartStrings.error) ||
          'Something went wrong.';
        kit.error.classList.remove('bundle--hidden');
      }

      hideError(kit) {
        if (!kit.error) return;

        kit.error.textContent = '';
        kit.error.classList.add('bundle--hidden');
      }
    }
  );
}
