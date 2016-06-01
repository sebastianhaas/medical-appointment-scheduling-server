module.exports = function(Model, options) {
  // Model is the model class
  // options is an object containing the config properties from model definition
  Model.defineProperty('created', {type: 'date', default: '$now', required: true});
  Model.defineProperty('modified', {type: 'date', default: '$now', required: true});
  Model.defineProperty('createdBy', {type: 'number', required: true});
  Model.defineProperty('modifiedBy', {type: 'number', required: true});
};
