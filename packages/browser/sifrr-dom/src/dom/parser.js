const Vdom = require('./vdom');
const Parser = {
  sifrrNode: window.document.createElement('sifrr-node'),
  createStateMap: function(html) {
    // Empty map
    let nodes = [], attributes = [];

    // children
    if (Array.isArray(html)) {
      while(html.length) {
        const map = Parser.createStateMap(html.shift());
        Array.prototype.push.apply(nodes, map.nodes);
        Array.prototype.push.apply(attributes, map.attributes);
      }
      return { nodes: nodes, attributes: attributes };
    }

    // text node and sifrr-node
    if (html.nodeType === 3) {
      const x = html.nodeValue;
      if (x.indexOf('${') > -1) {
        if (html.parentNode.contentEditable != 'true' && html.parentNode.dataset && html.parentNode.dataset.sifrrHtml == 'true') {
          nodes.push({
            tag: html.parentNode.nodeName,
            data: html.parentNode.innerHTML,
            dom: html.parentNode
          });
          html.parentNode.originalVdom = Vdom.toVdom(html.parentNode);
        } else if (html.parentNode.contentEditable == 'true' || html.parentNode.nodeName == 'TEXTAREA' || html.parentNode.nodeName == 'STYLE') {
          nodes.push({
            tag: html.parentNode.nodeName,
            data: x,
            dom: html.parentNode
          });
        } else {
          let sn = Parser.sifrrNode.cloneNode();
          const clone = html.cloneNode();
          sn.appendChild(clone);
          sn.originalVdom = {
            children: [{
              tag: '#text',
              data: x,
              dom: clone
            }]
          };
          html.replaceWith(sn);
          nodes.push({
            tag: 'sifrr-node',
            data: x,
            dom: sn
          });
        }
      }
      return { nodes: nodes, attributes: attributes };
    }

    // attributes
    const attrs = html.attributes || [], l = attrs.length;
    for(let i = 0; i < l; i++) {
      const attribute = attrs[i];
      if (attribute.value.indexOf('${') > -1) {
        attributes.push({
          name: attribute.name,
          value: attribute.value,
          dom: html
        });
      }
    }

    // children
    const children = Parser.createStateMap(Array.prototype.slice.call(html.childNodes));
    Array.prototype.push.apply(nodes, children.nodes);
    Array.prototype.push.apply(attributes, children.attributes);

    // return parent
    return { nodes: nodes, attributes: attributes };
  },
  twoWayBind: function(e) {
    const target = e.path ? e.path[0] : e.target;
    if (!target.dataset.sifrrBind) return;
    const value = target.value === undefined ? target.innerHTML : target.value;
    let data = {};
    data[target.dataset.sifrrBind] = value;
    target.getRootNode().host.state = data;
  },
  updateState: function(element) {
    if (!element.stateMap) {
      return false;
    }
    // Update nodes
    const nodes = element.stateMap.nodes, nodesL = nodes.length;
    for (let i = 0; i < nodesL; i++) {
      Parser.updateNode(nodes[i], element);
    }

    // Update attributes
    const attributes = element.stateMap.attributes, attributesL = attributes.length;
    for (let i = 0; i < attributesL; i++) {
      Parser.updateAttribute(attributes[i], element);
    }
  },
  updateNode: function(node, element) {
    // make use of VDOM for better diffing!
    const realHTML = node.dom.innerHTML;
    const newHTML = Parser.evaluateString(node.data, element);
    if (realHTML == newHTML) return;
    if (newHTML === undefined) return node.dom.textContent = '';
    if (Array.isArray(newHTML) && newHTML[0] && newHTML[0].nodeType) {
      node.dom.innerHTML = '';
      node.dom.append(...newHTML);
    } else if (newHTML.nodeType) {
      node.dom.innerHTML = '';
      node.dom.appendChild(newHTML);
    } else {
      if (node.dom.dataset && node.dom.dataset.sifrrHtml == 'true') {
        node.dom.innerHTML = newHTML.toString()
          .replace(/&amp;/g, '&')
          .replace(/&nbsp;/g, ' ')
          .replace(/(&lt;)(((?!&gt;).)*)(&gt;)(((?!&lt;).)*)(&lt;)\/(((?!&gt;).)*)(&gt;)/g, '<$2>$5</$8>')
          .replace(/(&lt;)(input|link|img|br|hr|col|keygen)(((?!&gt;).)*)(&gt;)/g, '<$2$3>');
      } else {
        if (node.dom.childNodes[0].textContent !== newHTML) node.dom.childNodes[0].textContent = newHTML.toString();
      }
    }
  },
  updateAttribute: function(attr, element) {
    const val = Parser.evaluateString(attr.value, element);
    attr.dom.setAttribute(attr.name, val);

    // select's value doesn't change on changing value attribute
    if (attr.dom.nodeName == 'SELECT' && attr.name == 'value') attr.dom.value = val;
  },
  evaluateString: function(string, element) {
    if (string.indexOf('${') < 0) return string;
    string = string.trim();
    if (string.match(/^\${([^{}$]|{([^{}$])*})*}$/)) return replacer(string);
    return string.replace(/\${([^{}$]|{([^{}$])*})*}/g, replacer);

    function replacer(match) {
      let g1 = match.slice(2, -1);

      function executeCode() {
        let f;
        if (g1.search('return') >= 0) {
          f = new Function(g1).bind(element);
        } else {
          f = new Function('return ' + g1).bind(element);
        }
        try {
          return f();
        } catch (e) {
          return match;
        }
      }
      return executeCode();
    }
  }
};

module.exports = Parser;