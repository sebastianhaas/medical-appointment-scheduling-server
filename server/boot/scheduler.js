var schedule = require('node-schedule');
var moment = require('moment');

module.exports = function(app, cb) {
  app.scheduledJobs = [];

  // Schedule default job for reminders
  var rule = new schedule.RecurrenceRule();
  rule.minute = 0;
  rule.hour = 13;
  var defaultRemindersJob = schedule.scheduleJob(rule, function() {
    console.log('Default reminder task triggered.');
  });
  app.scheduledJobs.push(defaultRemindersJob);
  cb();
};
