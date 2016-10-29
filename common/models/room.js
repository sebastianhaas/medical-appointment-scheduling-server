module.exports = function(Room) {

  Room.remoteMethod(
    'insertTestData',
    {
      description: 'Insert sample data set of test rooms.',
      http: {path: '/insertTestData', verb: 'post'},
      returns: {arg: 'insertCount', type: 'number'}
    }
  );

  Room.insertTestData = function(cb) {
    var testData = require('../../test/data/rooms.json');
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
