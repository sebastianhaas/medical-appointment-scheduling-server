module.exports = function(Patient) {

  Patient.remoteMethod(
    'insertTestData',
    {
      description: 'Insert sample data set of test patients.',
      http: {path: '/insertTestData', verb: 'post'},
      accepts: [
        {arg: 'locale', type: 'string', 'required': false, http: {source: 'query'}}
      ],
      returns: {arg: 'insertCount', type: 'number'}
    }
  );

  Patient.insertTestData = function(locale, cb) {
    var testData;
    if (locale === 'de-AT') {
      testData = require('../../test/data/patients_de-AT.json');
    } else {
      testData = require('../../test/data/patients_en-US.json');
    }
    Patient.create(testData, function(err, models) {
      if (err) {
        cb(err);
      } else {
        cb(null, models.length);
      }
    });
  };

  Patient.remoteMethod(
    'deleteAllPatients',
    {
      description: 'Deletes all data.',
      http: {path: '/deleteAll', verb: 'delete'},
      returns: {arg: 'deletedCount', type: 'number'}
    }
  );

  Patient.deleteAllPatients = function(cb) {
    Patient.destroyAll(function(err, info) {
      if (err) {
        cb(err);
      } else {
        cb(null, info.count);
      }
    });
  };

};
