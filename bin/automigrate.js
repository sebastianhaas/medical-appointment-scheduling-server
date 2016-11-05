var path = require('path');
var app = require(path.resolve(__dirname, '../server/server'));

var ds = app.datasources.postgresql;
ds.automigrate()
  .then(function(err) {
    if (err) { throw err; }
    ds.disconnect();
    console.log('Automigration done.');
    process.exit();
  });
