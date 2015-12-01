var logger = require('./src/utils/logger');

var templateKeys = {
  type: 'type', // t
  value: 'value', // r
  commentValue: 'value', // c
  children: 'children', // f
  tagName: 'tagName', // e
  attributes: 'attributes', // a
  dynamicAttributes: 'dynamicAttributes' // m
};
// Ractive compatibility
// templateKeys = {
//   type: 't',
//   value: 'r',
//   commentValue: 'c',
//   children: 'f',
//   tagName: 'e',
//   attributes: 'a',
//   dynamicAttributes: 'm'
// };

var types = {
  INTERPOLATOR: 2, // {{ }}
  TRIPLE: 3, // {{{ }}}
  SECTION: 4, // {{# }}
  ELEMENT: 7, // <>
  PARTIAL: 8, // {{> }}
  COMMENT: 9, // {{! }}
  CLOSING_TAG: 14, // {{/ }}
  REFERENCE: 30, // {{! w/ }}
  SECTION_UNLESS: 51 // {{^ }}
};

function TemplateStack() {
  this.startID = '';
  this.result = [];
  this.stack = [];
}

TemplateStack.prototype.peek = function() {
  return this.stack[this.stack.length - 1];
};

TemplateStack.prototype.getID = function() {
  var id;
  if (this.stack.length) {
    var openElem = this.peek();
    id = openElem.id + '.' + openElem.children.length;
  } else {
    id = this.startID + this.result.length;
  }
  return id;
};


TemplateStack.prototype.openElement = function(type, value) {
  var elem = {
    children: [],
    type: type,
    id: this.getID()
  };
  if (type === types.ELEMENT) {
    elem.tagName = value;
    elem.attributes = [];
    elem.isOpen = true;
  } else {
    elem.value = value;
  }
  this.stack.push(elem);

  return elem;
};

TemplateStack.prototype.processObject = function(obj) {
  if (typeof obj === 'string') {
    return obj;
  }
  var processed = {};
  switch (obj.type) {
    case types.ELEMENT:
      processed[templateKeys.type] = types.ELEMENT;
      processed[templateKeys.tagName] = obj.tagName;
      processed[templateKeys.attributes] = obj.attributes;
      if (obj.children && obj.children.length > 0) {
        processed[templateKeys.children] = obj.children;
      }
      break;
    case 'comment':
      processed[templateKeys.type] = types.COMMENT;
      processed[templateKeys.commentValue] = obj.text;
      break;
    case types.INTERPOLATOR:
    case types.TRIPLE:
    case types.REFERENCE:
      processed[templateKeys.type] = obj.type;
      processed[templateKeys.value] = obj.value;
      break;
    case types.PARTIAL:
    case types.SECTION:
    case types.SECTION_UNLESS:
      processed[templateKeys.type] = obj.type;
      processed[templateKeys.value] = obj.value;
      if (obj.children && obj.children.length > 0) {
        processed[templateKeys.children] = obj.children;
      }
      break;
    case 'attributename':
    case 'attributevalue':
    case 'attributeend':
      processed = obj;
  }
  return processed;
};

/**
 * When an element is resolved, push it to the result or the parent item on the stack
 * @param  {Object} obj Text / Widget / or Tungsten node
 * @return {[type]}     [description]
 */
TemplateStack.prototype._closeElem = function(obj) {
  var i;

  if (obj.children && obj.children.length) {
    // Process child nodes
    for (i = obj.children.length; i--;) {
      obj.children[i] = this.processObject(obj.children[i]);
    }
  }

  var pushingTo;
  if (this.stack.length > 0) {
    var top = this.peek();
    if (top.type === types.ELEMENT && top.isOpen) {
      pushingTo = top.attributes;
    } else {
      pushingTo = top.children;
    }
  } else {
    pushingTo = this.result;
    obj = this.processObject(obj);
  }

  // Combine adjacent strings
  if (typeof obj === 'string' && typeof pushingTo[pushingTo.length - 1] === 'string') {
    pushingTo[pushingTo.length - 1] += obj;
  } else {
    pushingTo.push(obj);
  }
};

TemplateStack.prototype.createObject = function(obj, options) {
  if (obj && obj.type === 'Widget') {
    obj.id = this.getID();
  }
  this._closeElem(obj, options);
};

TemplateStack.prototype.createComment = function(text) {
  this._closeElem({
    type: 'comment',
    text: text
  });
};

TemplateStack.prototype.popElement = function() {
  return this.stack.pop();
};

TemplateStack.prototype.closeElement = function(closingElem) {
  var openElem = this.peek();
  var id = closingElem.id;
  var tagName = closingElem.tagName;
  if (openElem) {
    var openID = openElem.id;
    if (openID !== id) {
      logger.warn(tagName + ' tags improperly paired, closing ' + openID + ' with close tag from ' + id);
      openElem = this.stack.pop();
      while (openElem && openElem.tagName !== tagName) {
        this._closeElem(openElem);
        openElem = this.stack.pop();
      }
    } else {
      // If they match, everything lines up
      this._closeElem(this.stack.pop());
    }
  } else if (tagName === 'p') {
    // For some reason a </p> creates an empty tag
    this.closeElement(this.openElement('p', {}));
  } else {
    // Something has gone terribly wrong
    logger.warn('Closing element ' + id + ' when the stack was empty');
  }
};

/**
 * Postprocessing for an array result
 * This allows stacks to create DocumentFragments or join the array to create the expected output type
 * @param  {Array<Any>} output Array of result objects
 * @return {Any}               Processed result
 */
TemplateStack.prototype.processArrayOutput = function(output) {
  return output;
};

TemplateStack.prototype.getOutput = function() {
  while (this.stack.length) {
    this.closeElement(this.peek());
  }
  // If there is only one result, it's already been processed
  // For multiple results, allow Stacks to process array
  return this.result.length === 1 ? this.result[0] : this.processArrayOutput(this.result);
};

TemplateStack.prototype.clear = function() {
  this.result = [];
  this.stack = [];
};

module.exports = TemplateStack;

function processAttributeArray(attrArray) {
  var attrs = {
    'static': {},
    'dynamic': []
  };
}
