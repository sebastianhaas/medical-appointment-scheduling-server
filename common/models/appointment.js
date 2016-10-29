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

  Appointment.findTime = function(durationString, examinationId, roomId, startDate, cb) {

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

        if (
          !tasks ||
          results.funcResources.length <= 0  ||
          results.funcSchedule.length <= 0
        ) {
          var error = new Error();
          error.status = 400;
          error.message = 'Not all required resources were found.';
          cb(error);
        } else {
          // Create schedule and return request
          cb(null, schedulejs.create(
            tasks,
            results.funcResources,
            results.funcSchedule,
            startDate ? startDate : moment().hour(0).minute(0).second(0).millisecond(0)
                                    .add(1, 'day').toDate()
          ));
        }
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
        {arg: 'roomId', type: 'number', required: false, http: {source: 'query'}},
        {arg: 'startDate', type: 'date', 'required': false, http: {source: 'query'}}
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

  Appointment.deleteAllAppointments = function(cb) {
    Appointment.destroyAll(null, function(err, info) {
      if (err) {
        cb(err);
      } else {
        cb(null, parseInt(info.count));
      }
    });
  };

  Appointment.remoteMethod(
    'deleteAllAppointments',
    {
      description: 'Deletes all data.',
      http: {path: '/deleteAll', verb: 'delete'},
      returns: {arg: 'deletedCount', type: 'number'}
    }
  );

  Appointment.deleteAllAppointments = function(cb) {
    Appointment.destroyAll(null, function(err, info) {
      if (err) {
        cb(err);
      } else {
        cb(null, parseInt(info.count));
      }
    });
  };

  Appointment.remoteMethod(
    'generateRandomAppointments',
    {
      description: 'Deletes all data.',
      accepts: [
        {arg: 'freeDays', type: 'array', required: false, http: {source: 'query'}},
        {arg: 'startDate', type: 'date', required: false, http: {source: 'query'}},
        {arg: 'endDate', type: 'date', required: false, http: {source: 'query'}}
      ],
      http: {path: '/generateRandomAppointments', verb: 'post'},
      returns: {arg: 'success', type: 'boolean'}
    }
  );

  Appointment.generateRandomAppointments = function(freeDays, startDate, endDate, cb) {
    // Take care of parameters and defaults
    if (startDate) {
      startDate = moment(startDate).startOf('day');
    } else {
      startDate = moment().startOf('isoWeek').startOf('day');
    }
    if (endDate) {
      endDate = moment(endDate).startOf('day');
    } else {
      endDate = moment().endOf('isoWeek').startOf('day');
    }
    if (!freeDays) {
      freeDays = [7]; // Sunday is free by default
    }

    // Get all examinations, patients and rooms
    async.parallel({
        examinations: function(callback) {
          Appointment.app.models.Examination.find(null, function(err, result) {
            if (err) {
              callback(err);
            } else {
              console.log('Retrieved examinations.');
              callback(null, result);
            }
          });
        },
        patients: function(callback) {
          Appointment.app.models.Patient.find(null, function(err, result) {
            if (err) {
              callback(err);
            } else {
              console.log('Retrieved patients.');
              callback(null, result);
            }
          });
        },
        rooms: function(callback) {
          Appointment.app.models.Room.find(null, function(err, result) {
            if (err) {
              callback(err);
            } else {
              console.log('Retrieved rooms.');
              callback(null, result);
            }
          });
        }
      }, function(err, results) {
      if (err) {
        cb(err);
      } else {
        console.log('Finished preparation tasks.');

        // Iterate day by day over timespan and add random appointments
        var currDate = startDate.clone();

        async.during(
          function(callback) {
            return callback(null, currDate.diff(endDate) <= 0);
          },
          function(callback) {
            // Check if currDate is not a free day
            if (freeDays.indexOf(currDate.isoWeekday()) === -1) {
              generateRandomAppointmentsForDay(
                currDate,
                results.examinations,
                results.patients,
                results.rooms,
                callback
              );
            } else {
              console.log('Ignoring ... since it\'s being activeley ignored.');
            }
            currDate.add(1, 'day');
          },
          function(err) {
            if (err) {
              cb(err);
            } else {
              console.log('Finished generating random appointments for all days.');
              cb(null, true);
            }
          }
        );
      }
    });
  };

  function generateRandomAppointmentsForDay(
    date, examinations, patients, rooms, mainCallback
  ) {
    var startOfDay = date.clone().startOf('day');
    var endOfDay = date.clone().endOf('day');
    console.log('Generate appointments for ' + startOfDay.format());
    var dayFullyBooked = false;
    var appointments = [];

    async.during(

      // Check if we need to find more appointments for today
      function(callback) {
        // Create new appointments as long as the day is not fully booked
        return callback(null, !dayFullyBooked);
      },

      // Find another appointment for the current day
      function(callback) {
        // Select random patient and examination
        var randExam = examinations[Math.floor(Math.random() * examinations.length)];
        var randPatient = patients[Math.floor(Math.random() * patients.length)];

        // And find an appointment
        Appointment.findTime(
         randExam.duration, randExam.id, null, startOfDay.toDate(),
         function(err, schedule) {
          if (err) {
            callback(err);
          } else {
            console.log('For patient ' + randPatient.name);
            console.log(schedule.success);
            console.log(schedule.scheduledTasks.NewAppointment);
            if (moment(schedule.start).isAfter(endOfDay)) {
              // The appointment was scheduled for the next day
              dayFullyBooked = true;
              console.log('Scheduled for the next day, unfortunately.');
              callback(null);
            } else {
              // The appointment was scheduled for the given day, so add it
              var slot = schedule.scheduledTasks.NewAppointment.schedule[0];
              Appointment.create({
                title: '',
                description: '',
                start: new Date(slot.start),
                end: new Date(slot.end),
                roomId: slot.resources[0],
                patientId: randPatient.id,
                created: new Date(),
                modified: new Date(),
                createdBy: 0,
                modifiedBy: 0
              }, function(err, newAppointment) {
                if (err) {
                  callback(err);
                } else {
                  console.log('Found and inserted: ' + newAppointment);
                  newAppointment.examinations.add(randExam.id, function(err) {
                    if (err) {
                      callback(err);
                    } else {
                      callback(null);
                    }
                  });
                }
              });
            }
          }
        });
      },

      // Day is fully booked, finish up
      function(err) {
        if (err) {
          mainCallback(err);
        } else {
          console.log('Day fully booked. Finished adding appointments for ....');
          mainCallback(null);
        }
      }

    );
  }

};
