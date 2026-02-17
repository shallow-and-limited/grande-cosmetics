class TabbedContent extends HTMLElement {
  constructor() {
    super();

    this.tabs = this.querySelectorAll('[role="tab"]');
    this.panels = this.querySelectorAll('[role="tabpanel"]');

    this.initTabs();
  }

  initTabs() {
    this.tabs.forEach((tab) => {
      tab.addEventListener('click', () => this.selectTab(tab));
      tab.addEventListener('keydown', (event) => this.onKeydown(event, tab));
    });
  }

  selectTab(selectedTab) {
    this.panels.forEach((panel) => (panel.setAttribute('hidden', 'true')));
    this.tabs.forEach((tab) => tab.setAttribute('aria-selected', 'false'));

    const panel = this.querySelector(
      `#${selectedTab.getAttribute('aria-controls')}`
    );

    if(panel) {
      panel.removeAttribute('hidden');
    }
    
    selectedTab.setAttribute('aria-selected', 'true');
    selectedTab.focus();
  }

  onKeydown(event, tab) {
    const key = event.key;
    let newTab;

    if (key === 'ArrowLeft' || key === 'ArrowUp') {
      newTab = tab.parentElement.previousElementSibling.querySelector('[role="tab"]') || this.tabs[this.tabs.length - 1];
    } else if (key === 'ArrowRight' || key === 'ArrowDown') {
      newTab = tab.parentElement.nextElementSibling.querySelector('[role="tab"]') || this.tabs[0];
    } else if (key === 'Home') {
      newTab = this.tabs[0];
    } else if (key === 'End') {
      newTab = this.tabs[this.tabs.length - 1];
    }

    if (newTab) {
      event.preventDefault();
      this.selectTab(newTab);
    }
  }
}

customElements.define('tabbed-content', TabbedContent);
