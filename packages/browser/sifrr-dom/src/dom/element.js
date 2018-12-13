const Parser = require('./parser');
const JsonExt = require('../utils/json');
const Loader = require('./loader');

class Element extends window.HTMLElement {
  static get observedAttributes() {
    return ['data-sifrr-state'].concat(this.observedAttrs || []);
  }

  static get template() {
    return Loader.all[this.elementName];
  }

  static get elementName() {
    return this.name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  constructor() {
    super();
    this._state = Object.assign({}, this.constructor.defaultState, this._state);
    this.attachShadow({
      mode: 'open'
    }).appendChild(this.constructor.template.content.cloneNode(true));
    this.stateMap = Parser.createStateMap(this.shadowRoot);
    this.shadowRoot.addEventListener('change', Parser.twoWayBind);
  }

  connectedCallback() {
    this.state = JsonExt.parse(this.dataset.sifrrState) || {};
  }

  disconnectedCallback() {
    if (this.shadowRoot) this.shadowRoot.removeEventListener('change', Parser.twoWayBind);
    else this.removeEventListener('change', Parser.twoWayBind);
  }

  attributeChangedCallback(attrName, oldVal, newVal) {
    if (attrName === 'data-sifrr-state') {
      this.state = JsonExt.parse(newVal);
    }
  }

  get state() {
    return this._state;
  }

  set state(v) {
    Object.assign(this._state, v);
    Parser.updateState(this);
  }

  isSifrr(name = null) {
    if (name) return name == this.constructor.elementName;
    else return true;
  }

  clearState() {
    this._lastState = Object.assign({}, this._state);
    this._state = {};
    Parser.updateState(this);
  }
}

module.exports = Element;