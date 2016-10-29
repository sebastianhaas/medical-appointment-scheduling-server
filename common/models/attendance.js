const gaussian = require('gaussian');
const moment = require('moment');

module.exports = function(Attendance) {

  Attendance.deleteAllAttendances = function(cb) {
    Attendance.destroyAll(null, function(err, info) {
      if (err) {
        cb(err);
      } else {
        cb(null, parseInt(info.count));
      }
    });
  };

  Attendance.remoteMethod(
    'deleteAllAttendances',
    {
      description: 'Deletes all data.',
      http: {path: '/deleteAll', verb: 'delete'},
      returns: {arg: 'deletedCount', type: 'number'}
    }
  );

  Attendance.generateRandomAttendances = function(cb) {
    var attendances = [];
    Attendance.app.models.Appointment.find(null, function(err, appointments) {
      if (err) {
        cb(err);
      } else {
        for (var i = appointments.length - 1; i >= 0; i--) {
          attendances.push(generateRandomAttendance(appointments[i]));
        }
        Attendance.create(attendances, function(err, results) {
          if (err) {
            cb(err);
          } else {
            cb(null, results);
          }
        });
      }
    });
  };

  function generateRandomAttendance(appointment) {
    var checkedIn = getNormalDistributedDate(moment(appointment.start)
                    .subtract(15, 'minutes'), 15);
    var underTreatment = getNormalDistributedDate(moment(appointment.start)
                         .add(5, 'minutes'), 5);
    var plannedDuration = moment(appointment.end).diff(moment(appointment.start));
    var finished;

    while (!finished || finished.isSameOrBefore(underTreatment)) {
      finished = getNormalDistributedDate(underTreatment.clone()
                     .add(plannedDuration), 10);
    }

    return {
      checkedIn: checkedIn.toDate(),
      underTreatment: underTreatment.toDate(),
      finished: finished.toDate(),
      appointmentId: appointment.id
    };
  }

  function getNormalDistributedDate(baseMoment, minutesMultiplier) {
    var scheduled = moment(baseMoment).valueOf();
    var muliplier = moment(0).add(minutesMultiplier, 'minutes').valueOf();
    var distribution = gaussian(0, 1);
    // Take a random sample using inverse transform sampling method.
    return moment(scheduled + (distribution.ppf(Math.random()) * muliplier));
  }

  Attendance.remoteMethod(
    'generateRandomAttendances',
    {
      description: 'Generates random attendances for all past events.',
      http: {path: '/generateRandomAttendances', verb: 'post'},
      returns: {arg: 'generatedAttendances', type: 'array', root: true}
    }
  );
};
