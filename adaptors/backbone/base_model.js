/**
 * Base Model - Provides generic reusable methods that child models can inherit from
 */
'use strict';
var Backbone = require('backbone');
var backboneNested = require('./backbone_nested');
/**
 * BaseModel
 *
 * @constructor
 * @class BaseModel
 */
var BaseModel = Backbone.Model.extend({
  tungstenModel: true,
  initialize: function() {
    this.postInitialize();
  },

  /* develblock:start */
  getDebugName: function() {
    return this.constructor.debugName ? this.constructor.debugName + this.cid.replace('c', '') : this.cid;
  },
  /* develblock:end */

  postInitialize: function() {}
});

// Add nested collection/model support with backbone_nested.
// To use, set a hash of relations on a model.
// See backbone_nested_spec for examples.
backboneNested.setNestedModel(BaseModel);

module.exports = BaseModel;