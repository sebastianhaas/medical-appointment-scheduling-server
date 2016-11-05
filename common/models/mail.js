'use strict';
/* jshint loopfunc:true */

const moment = require('moment');
const parallel = require('async/parallel');
const schedule = require('node-schedule');
const url = require('url');
const uuid = require('node-uuid');

module.exports = function(Mail) {

  Mail.remoteMethod(
    'autoAppointment',
    {
      description: 'Finds free slots for an appointment with the specified duration.',
      http: {path: '/autoAppointment', verb: 'post'},
      accepts: [
        {arg: 'relayedMessages', type: 'object', required: true, http: {source: 'body'}}
      ]
    }
  );

  Mail.autoAppointment = function(relayedMessages, cb) {
    var blockDuration = 'PT30M';
    for (var i = 0; i < relayedMessages.length; i++) {
      var msg;
      var from;
      // Sparkpost specific, see https://developers.sparkpost.com/api/relay-webhooks.html
      // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      /* jshint ignore:start */
      msg = relayedMessages[i].msys.relay_message.content;
      from = relayedMessages[i].msys.relay_message.friendly_from;
      /* jshint ignore:end */
      // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

      // Get offers and hand them over by mail
      getAutoAppointmentOffer(blockDuration, 10, 'PT40M', 10, 0, function(err, offers) {
        if (err) {
          cb(err);
        } else {
          var text = 'We are happy to offer you the following appointments:<br /><br />';

          for (var i = 0; i < offers.length; i++) {
            text += JSON.stringify(offers[i]) + '<br />';
            text += '<a href="';
            text += Mail.app.get('clientAutoAppointmentAcceptEndpoint');
            text += offers[i].autoAppointmentBlockedSecret;
            text += '" >Accept</a><br /><br />';
            text += '<br /><br />';
            text += 'These reservations will be canceled automatically ';
            text += moment.duration(blockDuration).humanize(true) + '.<br />';
          }

          // Found dates, now send them as mail
          Mail.send({
            to: from,
            from: 'auto-appointment@scheduling-server.herokuapp.com',
            subject: 'Your requested appointment',
            text: text,
            html: text
          }, function(err, mail) {
            if (err) {
              cb(err);
            } else {
              console.log('Email Sent!');
              console.log(mail);
              cb(null);
            }
          });
        }
      });
    }
  };

  /**
   * Returns an offer of possible appointments for a patient.
   * The offered appointments will be occupied for 30 minutes.
   *
   * Returns an array of appointments that have been blocked for the
   * next 30 minutes.
   */
  function getAutoAppointmentOffer(blockDuration, patientId, durationString,
    examinationId, roomId, cb) {
    var secretBase = uuid.v4();
    // Query for an appointment, with the earliest date set to three, ten and 20 days.
    parallel({
        threeDays: function(callback) {
          Mail.app.models.Appointment.findTime(
            durationString,
            examinationId,
            roomId,
            moment().add(3, 'days').toDate(),
            function(err, schedule) {
              if (err) {
                callback(err);
              } else {
                if (!schedule.success) {
                  callback(schedule.failedTasks);
                } else {
                  // Block the found slot for 30 minutes
                  blockSlot(
                    secretBase + '0',
                    patientId,
                    examinationId,
                    schedule.scheduledTasks.NewAppointment.schedule[0],
                    blockDuration,
                    function(err, blockedOffer) {
                      if (err) {
                        callback(err);
                      } else {
                        callback(null, blockedOffer);
                      }
                    });
                }
              }
            });
        },
        tenDays: function(callback) {
          Mail.app.models.Appointment.findTime(
            durationString,
            examinationId,
            roomId,
            moment().add(10, 'days').toDate(),
            function(err, schedule) {
              if (err) {
                callback(err);
              } else {
                if (!schedule.success) {
                  callback(schedule.failedTasks);
                } else {
                  // Block the found slot for 30 minutes
                  blockSlot(
                    secretBase + '1',
                    patientId,
                    examinationId,
                    schedule.scheduledTasks.NewAppointment.schedule[0],
                    blockDuration,
                    function(err, blockedOffer) {
                      if (err) {
                        callback(err);
                      } else {
                        callback(null, blockedOffer);
                      }
                    });
                }
              }
            });
        },
        twentyDays: function(callback) {
          Mail.app.models.Appointment.findTime(
            durationString,
            examinationId,
            roomId,
            moment().add(20, 'days').toDate(),
            function(err, schedule) {
              if (err) {
                callback(err);
              } else {
                if (!schedule.success) {
                  callback(schedule.failedTasks);
                } else {
                  // Block the found slot for 30 minutes
                  blockSlot(
                    secretBase + '2',
                    patientId,
                    examinationId,
                    schedule.scheduledTasks.NewAppointment.schedule[0],
                    blockDuration,
                    function(err, blockedOffer) {
                      if (err) {
                        callback(err);
                      } else {
                        callback(null, blockedOffer);
                      }
                    });
                }
              }
            });
        }
      }, function(err, results) {
        if (err) {
          cb(err);
        } else {
          var offers = [];
          offers.push(results.threeDays);
          offers.push(results.tenDays);
          offers.push(results.twentyDays);

          // Schedule job to delete offers after blockDuration
          var duration = moment.duration(blockDuration);
          var blockedUntil = moment().add(duration);
          var clearJob = schedule.scheduleJob(blockedUntil.toDate(), function(secret) {
            console.log('Deleting auto-appointment offers since they expired.');
            Mail.app.models.Appointment.deleteAutoAppointmentSet(
              secret + '0',
              function(err) {
                if (err) {
                  console.log('Failed to delete auto-appointment offers.');
                } else {
                  console.log('Successfully deleted auto-appointment offers.');
                }
              });
          }.bind(null, secretBase));
          Mail.app.scheduledJobs.push(clearJob);

          // Return offers
          cb(null, offers);
        }
      });
  }

  /**
   * Takes a slot as returned by `Appointment.findTime()` and blocks it for
   * the specified amount of time.
   */
  function blockSlot(secret, patientId, examinationId,
    scheduleSlot, blockDurationString, cb) {
    Mail.app.models.Appointment.create({
      autoAppointmentBlockedSecret: secret,
      title: 'Offered Appointment',
      description: 'This appointment was blocked for ' + blockDurationString +
      ' by an auto-appointment request.',
      start: new Date(scheduleSlot.start),
      end: new Date(scheduleSlot.end),
      roomId: scheduleSlot.resources[0],
      patientId: patientId,
      created: new Date(),
      modified: new Date(),
      createdBy: 0,
      modifiedBy: 0
    }, function(err, newAppointment) {
      if (err) {
        cb(err);
      } else {
        newAppointment.examinations.add(examinationId, function(err) {
          if (err) {
            cb(err);
          } else {
            cb(null, newAppointment);
          }
        });
      }
    });
  }
};
