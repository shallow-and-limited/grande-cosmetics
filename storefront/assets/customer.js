class AddressComponent extends HTMLElement {
  constructor() {
    super();

    this.editButton = this.querySelector('[data-edit-address]');
    this.editForm = this.querySelector('.customer__address-form');

    this.resetButton = this.querySelector('[type="reset"]');

    this.deleteButton = this.querySelector('[data-confirm-message]');

    if (this.editButton) {
      this.editButton.addEventListener(
        'click',
        this.handleEditButtonClick.bind(this)
      );
    }

    if (this.resetButton) {
      this.resetButton.addEventListener(
        'click',
        this.handleResetButtonClick.bind(this)
      );
    }

    if (this.deleteButton) {
      this.deleteButton.addEventListener(
        'click',
        this.handleDeleteButtonClick.bind(this)
      );
    }
  }

  handleDeleteButtonClick() {
    if (confirm(this.deleteButton.getAttribute('data-confirm-message'))) {
      Shopify.postLink(this.deleteButton.dataset.target, {
        parameters: { _method: 'delete' },
      });
    }
  }

  handleEditButtonClick() {
    this.editForm.classList.toggle('hidden');
  }

  handleResetButtonClick() {
    this.editForm.classList.add('hidden');
  }
}

customElements.define('address-component', AddressComponent);
