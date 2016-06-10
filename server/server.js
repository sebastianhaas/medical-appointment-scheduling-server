var loopback = require('loopback');
var boot = require('loopback-boot');
var bunyan = require('bunyan');
var bunyanRequest = require('bunyan-request');
var bunyanSyslog = require('bunyan-syslog');

var app = module.exports = loopback();

// Set up logging
var logger = bunyan.createLogger({
  name: 'medical-appointment-scheduling-server',
  streams: [
  {
    level: 'debug',
    type: 'raw',
    stream: bunyanSyslog.createBunyanStream({
      type: 'udp',
      facility: bunyanSyslog.local0,
      host: '127.0.0.1',
      port: 11111
    })
  },
  {
    level: 'debug',
    stream: process.stdout
  }]
});
var requestLogger = bunyanRequest({
  logger: logger,
  headerName: 'x-request-id'
});
app.use(requestLogger);

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    logger.info('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      logger.info('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
