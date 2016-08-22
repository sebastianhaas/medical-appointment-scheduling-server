var schedulejs = require('schedulejs');
var later = require('later');
var moment = require('moment');
var async = require('async');

// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
/* jshint camelcase: false */
module.exports = function(Appointment) {

  // Set up schedulejs
  schedulejs.date.UTC();

  // Define configuration variables
  var businessHoursStart;
  var businessHoursEnd;
  var businessDays;

  // As soon as the application is scaffolded, do initial setup work
  Appointment.on('attached', function(app) {
    getConfiguration(app);
  });

  Appointment.findTime = function(durationString, examinationId, roomId, cb) {

    // Prepare tasks and resources to calculate schedule in parallel
    async.parallel({

      // Get duration of the appointment to be planned in minutes
      funcDuration: function(callback) {
        callback(null, moment.duration(durationString).as('minutes'));
      },

      // Get the basic schedule (e.g. working hours and days)
      funcSchedule: function(callback) {
        callback(null, {
          schedules:
            [
              {
                't_a': [businessHoursStart],
                't_b': [businessHoursEnd],
                'd': businessDays
              }
            ]
        });
      },

      // Determine which rooms are required/possible for the new appointment
      funcResourcesRequired: function(callback) {
        // Check if a room was supplied. If not, retrieve all room ids and
        // hand them over to the task to be scheduled.
        if (roomId) {
          var resourcesRequired = [roomId];
          callback(null, resourcesRequired);
        } else {
          var Room = Appointment.app.models.Room;
          Room.find({fields: {id: true}}, function(err, rooms) {
            if (err) {
              console.log(err);
            }
            var resourcesRequired = [];
            var resourcesRequiredOrConcat = [];
            for (var i = 0; i < rooms.length; i++) {
              resourcesRequiredOrConcat.push(rooms[i].id);
            }
            resourcesRequired.push(resourcesRequiredOrConcat);
            callback(null, resourcesRequired);
          });
        }
      },

      funcResources: function(callback) {
        getResourcesFromRooms(function(resources) {
          callback(null, resources);
        });
      }

      // All callbacks have returned
    }, function(err, results) {
      if (err) {
        console.log(err);
      } else {
        // All prerequesites have been collected successfully, build task:
        var tasks = [
          {
            id: 'NewAppointment',
            duration: results.funcDuration,
            minSchedule: results.funcDuration,
            resources: results.funcResourcesRequired
          }
        ];

        // Create schedule and return request
        cb(null, schedulejs.create(
          tasks,
          results.funcResources,
          results.funcSchedule,
          new Date(1471109510000)
        ));
      }
    });

  };

  Appointment.remoteMethod(
    'findTime',
    {
      description: 'Finds free slots for an appointment with the specified duration.',
      http: {path: '/findTime', verb: 'get'},
      accepts: [
        {arg: 'duration', type: 'string', required: true, http: {source: 'query'}},
        {arg: 'examinationId', type: 'number', required: false, http: {source: 'query'}},
        {arg: 'roomId', type: 'number', required: false, http: {source: 'query'}}
      ],
      returns: {arg: 'startDates', type: 'object', root: true}
    }
  );

  /**
   * Returns an array of resources to use with schedule.js from rooms specified
   * within this application.
   * The generated resources will have existing appointments listed as exceptions
   * in the available schedule.
   */
  function getResourcesFromRooms(callback) {

    var resources = [];
    var availabitity = {
      schedules: [
        {
          't_a': [0] // Required for schedules to work, otherwise only days will match
        }
      ]
    };

    var Room = Appointment.app.models.Room;
    Room.find(function(err, rooms) {
      if (err) {
        console.log(err);
      }
      async.each(rooms, function(room, callback) {
        Appointment.find({
          where: {
            roomId: room.id
          }
        }, function(err, appointments) {
          if (err) {
            callback(err);
          }
          var res = {
            id: room.id,
            available: {
              schedules: [
                {t_a: [0]}
              ],
              exceptions: []
            }
          };

          for (var i = 0; i < appointments.length; i++) {
            var start         = moment(appointments[i].start).utc();
            var end           = moment(appointments[i].end).utc();
            var startMidnight = start.clone().startOf('day');
            var endMidnight   = end.clone().startOf('day');
            res.available.exceptions.push({
              D:    [start.date()],
              M:    [start.month() + 1], // momentjs/schedulejs ranges differ
              Y:    [start.year()],
              't_a': [start.diff(startMidnight, 'seconds')],
              't_b': [end.diff(endMidnight, 'seconds')]
            });
          }

          resources.push(res);
          callback();
        });
      },
      function(err) {
        if (err) {
          console.log('Failed to retrieve appointments for a room.');
        } else {
          callback(resources);
        }
      });
    });
  }

  function getConfiguration(app) {
    if (
      !app.get('businessHoursStart') ||
      !app.get('businessHoursEnd') ||
      !app.get('businessDays')
    ) {
      throw 'Configuration for business hours missing.';
    } else {
      businessHoursStart = moment(app.get('businessHoursStart'), 'HH:mm:ss').utc();
      businessHoursEnd   = moment(app.get('businessHoursEnd'), 'HH:mm:ss').utc();
      var midnight       = businessHoursStart.clone().startOf('day');
      businessHoursStart = businessHoursStart.diff(midnight, 'seconds');
      businessHoursEnd   = businessHoursEnd.diff(midnight, 'seconds');
      businessDays       = app.get('businessDays');
    }
  }
};
