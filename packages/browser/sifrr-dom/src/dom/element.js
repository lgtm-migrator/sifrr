const Parser = require('./parser');
const { update } = require('./update');
const Loader = require('./loader');
const SimpleElement = require('./simpleelement');
const { makeChildrenEqual } = require('./makeequal');

function elementClassFactory(baseClass) {
  return class extends baseClass {
    static extends(htmlElementClass) {
      return elementClassFactory(htmlElementClass);
    }

    static get observedAttributes() {
      return ['data-sifrr-state'].concat(this.observedAttrs());
    }

    static observedAttrs() {
      return [];
    }

    static get template() {
      return (Loader.all[this.elementName] || { template: false }).template;
    }

    static get ctemp() {
      this._ctemp = this._ctemp || this.template;
      if (window.ShadyCSS && this.useShadowRoot && !this._ctemp.shady) {
        window.ShadyCSS.prepareTemplate(this._ctemp, this.elementName);
        this._ctemp.shady = true;
      }
      return this._ctemp;
    }

    static get stateMap() {
      this._stateMap = this._stateMap || Parser.createStateMap(this.ctemp.content);
      return this._stateMap;
    }

    static get elementName() {
      return this.name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }

    static get useShadowRoot() {
      return this.useSR;
    }

    constructor() {
      super();
      if (this.constructor.ctemp) {
        this._state = Object.assign({}, this.constructor.defaultState, this.state);
        const content = this.constructor.ctemp.content.cloneNode(true);
        this._refs = Parser.collectRefs(content, this.constructor.stateMap);
        if (this.constructor.useShadowRoot) {
          this.attachShadow({
            mode: 'open'
          });
          this.shadowRoot.appendChild(content);
        } else {
          this.__content = content;
        }
      }
    }

    connectedCallback() {
      if(!this.constructor.useShadowRoot) {
        makeChildrenEqual(this, Array.prototype.slice.call(this.__content.childNodes));
      }
      if (!this.hasAttribute('data-sifrr-state')) this.update();
      this.onConnect();
    }

    onConnect() {}

    disconnectedCallback() {
      this.onDisconnect();
    }

    onDisconnect() {}

    attributeChangedCallback(attrName, oldVal, newVal) {
      if (attrName === 'data-sifrr-state') {
        this.state = JSON.parse(newVal);
      }
      this.onAttributeChange(attrName, oldVal, newVal);
    }

    onAttributeChange() {}

    get state() {
      return this._state;
    }

    set state(v) {
      if (this._state !== v) Object.assign(this._state, v);
      this.update();
      this.onStateChange();
    }

    onStateChange() {}

    update() {
      update(this);
    }

    onUpdate() {}

    isSifrr(name = null) {
      if (name) return name === this.constructor.elementName;
      else return true;
    }

    sifrrClone(deep) {
      return this.cloneNode(deep);
    }

    clearState() {
      this._state = {};
      this.update();
    }

    $(args, sr = true) {
      if (this.constructor.useShadowRoot && sr) return this.shadowRoot.querySelector(args);
      else return this.querySelector(args);
    }

    $$(args, sr = true) {
      if (this.constructor.useShadowRoot && sr) return this.shadowRoot.querySelectorAll(args);
      else return this.querySelectorAll(args);
    }

    static addArrayToDom(key, template) {
      this._arrayToDom = this._arrayToDom || {};
      // state of simple element is single array item, compatible with sifrr element
      this._arrayToDom[key] = SimpleElement(template);
    }

    arrayToDom(key, newState = this.state[key]) {
      this._domL = this._domL || {};
      const oldL = this._domL[key] || 0;
      const newL = newState.length;
      const domArray = new Array(newL);
      let temp;
      try {
        temp = this.constructor._arrayToDom[key];
        if (!temp) throw Error('');
      } catch(e) {
        return window.console.error(`[error]: No arrayToDom data of '${key}' added in ${this.constructor.elementName}.`);
      }
      for (let i = 0; i < newL; i++) {
        if (i < oldL) {
          domArray[i] = { type: 'stateChange', state: newState[i] };
        } else {
          const el = temp.sifrrClone(true);
          el.state = newState[i];
          domArray[i] = el;
        }
      }
      this._domL[key] = newL;
      return domArray;
    }
  };
}

module.exports = elementClassFactory(window.HTMLElement);
