'use strict';
/* jshint loopfunc:true */

const later = require('later');
const moment = require('moment');

module.exports = function(Notification) {
  /**
   * Once the app has loaded, fetch all pre-existing notifications that
   * haven't been done yet, and re-add them to the schedule so they get
   * executed properly.
   */
  Notification.on('attached', function() {
    console.log('Launching Notification service...');
    Notification.find({
      where: {
        or: [
          {
            done: null
          },
          {
            done: false
          }
        ]
      }
    }, function(err, notifications) {
      if (err) {
        console.log(err);
        console.log('Error launching Notification service.');
      } else {
        for (var i = notifications.length - 1; i >= 0; i--) {
          Notification.scheduleNotification(notifications[i]);
        }
        if (notifications.length <= 0) {
          console.log('No notifications pending.');
        }
      }
    });
    console.log('Launched Notification service.');
  });

  Notification.scheduleNotification = function(notification) {
    var compiledSchedule = later.schedule(notification.schedule);
    if (compiledSchedule.next() !== 0) { // Check if this notificaction is still relevant
      var t = later.setTimeout(
        function() {
          Notification.deliverNotification(notification.id);
        },
        notification.schedule
      );
      console.log('Scheduled notification %s.', notification.id);
    } else {
      // This notification was scheduled for a past date
      Notification.markAsDone(notification, function(err) {
        if (err) {
          console.log(err);
          console.log('Error marking overdue notification %s as done.', notification.id);
        } else {
          console.log('Marked %s done since it was last due on %s',
            notification.id, compiledSchedule.prev());
        }
      });
    }
  };

  /**
   * Delivers a notification via the transports specified.
   *
   * @param {int} notificationId The Id of the notification to be delivered
   * @param {function(err)} cb An optional callback
   */
  Notification.deliverNotification = function(notificationId, cb) {
    console.log('Starting to deliver notification with id %s...', notificationId);
    if (!cb) {
      cb = function(err) {};
    }
    Notification.findById(notificationId, function(err, notification) {
      if (err) {
        console.log(err);
        console.log('Failed to deliver notification %s.', notificationId);
      } else {
        for (var i = notification.transports.length - 1; i >= 0; i--) {
          if (notification.transports[i].type === 'mail') {
            Notification.transportByMail(
              notification,
              notification.transports[i].address,
              function(err) {
                if (err) {
                  cb(err);
                } else {
                  // TODO this has to be moved to the end of the transport section, since
                  //      we have to wait for all transports to finish. But we only have
                  //      one, so whatever. We can finish up here for now.
                  Notification.markAsDone(notification, function(err) {
                    if (err) {
                      cb(err);
                    } else {
                      cb(null);
                    }
                  });
                }
              });
          } else if (notification.transports[i].type === 'sms') {
            console.log('Transport \'sms\' not implemented yet. (Notification %s)',
              notification.id);
          } else {
            console.log('Unknown transport %s for notification %s',
              notification.transports[i].type, notification.id);
          }
        }
      }
      console.log('Triggered delivery of notification with id %s...', notificationId);
    });
  };

  Notification.transportByMail = function(notification, address, cb) {
    Notification.app.models.Mail.send({
      to: address,
      from: Notification.app.get('reminderFromAddress'),
      // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      /* jshint ignore:start */
      reply_to: Notification.app.get('reminderReplyToAddress'),
      /* jshint ignore:end */
      // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
      subject: notification.subject,
      text: notification.contentText,
      html: notification.contentHtml
    }, function(err, mail) {
      if (err) {
        console.log('Could not deliver notification %s using transport mail.',
          notification.id);
        console.log(err);
        cb(err);
      } else {
        console.log('Notification %s sent as email successfully.', notification.id);
        console.log(mail);
        cb(null);
      }
    });
  };

  /**
   * Sets the done flag on the given notification.
   */
  Notification.markAsDone = function(notification, cb) {
    notification.updateAttribute('done', true, function(err) {
      if (err) {
        cb(err);
      } else {
        cb(null);
      }
    });
  };

  Notification.afterRemote('create', function(ctx, remoteMethodOutput, next) {
    Notification.scheduleNotification(ctx.result);
    console.log('Added notification to delivery schedule');
    next();
  });
};
