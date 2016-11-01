module.exports = function(Room) {

  Room.remoteMethod(
    'insertTestData',
    {
      description: 'Insert sample data set of test rooms.',
      http: {path: '/insertTestData', verb: 'post'},
      accepts: [
        {arg: 'locale', type: 'string', 'required': false, http: {source: 'query'}}
      ],
      returns: {arg: 'insertCount', type: 'number'}
    }
  );

  Room.insertTestData = function(locale, cb) {
    var testData;
    if (locale === 'de-AT') {
      testData = require('../../test/data/rooms_de-AT.json');
    } else {
      testData = require('../../test/data/rooms_en-US.json');
    }
    Room.create(testData, function(err, models) {
      if (err) {
        cb(err);
      } else {
        cb(null, models.length);
      }
    });
  };

  Room.remoteMethod(
    'deleteAllRooms',
    {
      description: 'Deletes all data.',
      http: {path: '/deleteAll', verb: 'delete'},
      returns: {arg: 'deletedCount', type: 'number'}
    }
  );

  Room.deleteAllRooms = function(cb) {
    Room.destroyAll(function(err, info) {
      if (err) {
        cb(err);
      } else {
        cb(null, info.count);
      }
    });
  };

};
