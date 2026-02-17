class ListingComponent extends HTMLElement {
  constructor() {
    super();

    this.filterIds = ['FiltersForm', 'FiltersFormDrawer', 'FiltersSortForm'];

    this.sectionId = this.dataset.sectionId;
    this.cache = [];

    this.appendNext = false;

    this.initialSearchParams = window.location.search.slice(1);
    this.currentSearchParams = window.location.search.slice(1);

    this.hasFilters = false;
    this.countElement = this.querySelector('.facet__sort-count');

    this.forms = this.querySelectorAll('listing-form form');

    this.pills = document.getElementById('ListingPills');

    this.debouncedOnSubmit = debounce((event) => {
      this.onSubmitHandler(event);
    }, 400);

    this.forms.forEach((form) => {
      form.addEventListener('input', this.debouncedOnSubmit.bind(this));

      if (this.filterIds.indexOf(form.id) > -1) {
        this.hasFilters = true;
      }
    });

    window.addEventListener('popstate', (event) => {
      const searchParams = event.state
        ? event.state.searchParams
        : this.initialSearchParams;

      if (searchParams === this.currentSearchParams) return;

      this.renderPage(searchParams, null, false);
    });
  }

  onSubmitHandler(event) {
    event.preventDefault();

    const forms = [];

    this.forms.forEach((form) => {
      if (this.filterIds.indexOf(form.id) > -1) {
        if (form.contains(event.target)) {
          forms.push(this.createSearchParams(form));
        }
      } else {
        forms.push(this.createSearchParams(form));
      }
    });

    this.renderPage(forms.join('&'), event);
  }

  createSearchParams(form) {
    const formData = new FormData(form);

    return new URLSearchParams(formData).toString();
  }

  renderPage(searchParams, event, updateURLHash = true) {
    this.currentSearchParams = searchParams;

    this.classList.add('loading');

    const url = `${window.location.pathname}?section_id=${this.sectionId}&${searchParams}`;

    this.cache.some((element) => element.url === url)
      ? this.renderSectionFromCache(url, event)
      : this.renderSectionFromFetch(url, event);

    if (updateURLHash) this.updateURLHash(searchParams);
  }

  renderSectionFromFetch(url, event) {
    fetch(url)
      .then((response) => response.text())
      .then((responseText) => {
        const html = responseText;

        this.buildPage(url, html, event);
      });
  }

  renderSectionFromCache(url, event) {
    const html = this.cache.find((element) => element.url === url).html;

    this.buildPage(url, html, event);
  }

  updateURLHash(searchParams) {
    history.pushState(
      { searchParams },
      '',
      `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`
    );
  }

  buildPage(url, html, event) {
    this.cache.push({ html, url });

    if (this.hasFilters) {
      this.buildFilters(html, event);
    }

    if (this.pills) {
      this.buildPills(html, event);
    }

    this.buildProducts(html, event);

    if (this.countElement) {
      this.buildCount(html, event);
    }

    this.classList.remove('loading');
  }

  buildPills(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');
    this.pills.innerHTML = parsedHTML.getElementById('ListingPills').innerHTML;
  }

  buildCount(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');
    this.countElement.innerHTML =
      parsedHTML.querySelector('.facet__sort-count').innerHTML;
  }

  buildFilters(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');

    this.filterIds.forEach((filterId) => {
      const filterFromFetch = parsedHTML.getElementById(filterId);
      const filterFromDom = document.getElementById(filterId);

      if (!filterFromFetch) return;
      if (!filterFromDom) return;

      const detailsFromFetch = parsedHTML.querySelectorAll(
        `#${filterId} details`
      );
      const detailsFromDom = document.querySelectorAll(`#${filterId} details`);

      var openDetails = [];
      var closedDetails = [];

      detailsFromDom.forEach((detail) => {
        if (detail.open) {
          openDetails.push(detail.id);
        } else {
          closedDetails.push(detail.id);
        }
      });

      detailsFromFetch.forEach((detail) => {
        if (openDetails.indexOf(detail.id) > -1) {
          detail.open = true;
        } else {
          detail.open = false;
        }
      });

      filterFromDom.innerHTML = filterFromFetch.innerHTML;
    });

    if (event) {
      const selectedInput = document.querySelector(`#${event.target.id}`);

      if (selectedInput) {
        selectedInput.focus();
      }
    }
  }

  buildProducts(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');

    if (this.appendNext) {
      const gridItems = parsedHTML.querySelectorAll('#ProductGrid .grid__item');

      const gridContainer = document.getElementById('ProductGrid');

      gridItems.forEach((item) => {
        gridContainer.appendChild(item);
      });

      document.getElementById('Pagination').innerHTML =
        parsedHTML.getElementById('Pagination').innerHTML;
    } else {
      document.getElementById('ProductGridContainer').innerHTML =
        parsedHTML.getElementById('ProductGridContainer').innerHTML;

      document
        .getElementById('ProductGridContainer')
        .querySelectorAll('.scroll-trigger')
        .forEach((element) => {
          element.classList.remove('scroll-trigger');
          element.classList.remove('animate--slide-in');
        });
    }

    this.appendNext = false;
  }

  setAppendNext(value) {
    this.appendNext = value;
  }
}

customElements.define('listing-component', ListingComponent);

class PriceRange extends HTMLElement {
  constructor() {
    super();
    this.querySelectorAll('input').forEach((element) => {
      element.addEventListener('change', this.onRangeChange.bind(this));
      element.addEventListener('keydown', this.onKeyDown.bind(this));
    });
    this.setMinAndMaxValues();
  }

  onRangeChange(event) {
    this.adjustToValidValues(event.currentTarget);
    this.setMinAndMaxValues();
  }

  onKeyDown(event) {
    if (event.metaKey) return;

    const pattern =
      /[0-9]|\.|,|'| |Tab|Backspace|Enter|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Delete|Escape/;
    if (!event.key.match(pattern)) event.preventDefault();
  }

  setMinAndMaxValues() {
    const inputs = this.querySelectorAll('input');
    const minInput = inputs[0];
    const maxInput = inputs[1];
    if (maxInput.value) minInput.setAttribute('data-max', maxInput.value);
    if (minInput.value) maxInput.setAttribute('data-min', minInput.value);
    if (minInput.value === '') maxInput.setAttribute('data-min', 0);
    if (maxInput.value === '')
      minInput.setAttribute('data-max', maxInput.getAttribute('data-max'));
  }

  adjustToValidValues(input) {
    const value = Number(input.value);
    const min = Number(input.getAttribute('data-min'));
    const max = Number(input.getAttribute('data-max'));

    if (value < min) input.value = min;
    if (value > max) input.value = max;
  }
}

customElements.define('price-range', PriceRange);

class LoadMore extends HTMLElement {
  constructor() {
    super();

    this.params = this.dataset.params;

    this.listing = this.closest('listing-component');

    this.button = this.querySelector('.pagination__more');

    this.button.addEventListener('click', this.onButtonClick.bind(this));
  }

  onButtonClick() {
    this.listing.setAppendNext(true);
    this.listing.renderPage(this.params, null, false);
  }
}

customElements.define('load-more', LoadMore);
