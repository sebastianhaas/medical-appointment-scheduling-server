module.exports = function(Examination) {

  const possibleDurations = ['PT30M', 'PT40M', 'PT1H', 'PT1H30M', 'PT2H'];

  Examination.remoteMethod(
    'insertTestData',
    {
      description: 'Insert sample data set of test examinations.',
      http: {path: '/insertTestData', verb: 'post'},
      accepts: [
        {arg: 'sectionNumber', type: 'string', 'required': true, http: {source: 'query'}},
        {arg: 'locale', type: 'string', 'required': false, http: {source: 'query'}}
      ],
      returns: {arg: 'insertCount', type: 'number'}
    }
  );

  Examination.insertTestData = function(sectionNumber, locale, cb) {
    if (!locale) {
      locale = 'en_US';
    }
    const path = require('path');
    const parse = require('csv-parse');
    const fs = require('fs');
    const groups = require(path.join(__dirname, '../../test/data/examination-groups.json'));
    const materialPaletts = require('google-material-color').palette;
    delete materialPaletts.White;
    delete materialPaletts.Black;
    delete materialPaletts.Grey;
    const keys = Object.keys(materialPaletts);
    const testData = '../../test/data/examinations-icd.csv';
    var examinations = [];
    var header = true;

    // Get selected section
    var section = groups.sections.find(function(section) {
      if(section.sectionNumber === sectionNumber) {
        return section;
      }
    });
    if (!section) {
      cb(new Error('Invalid section: ' + sectionNumber));
    }

    fs.createReadStream(path.join(__dirname, testData))
    .pipe(parse({ from: section.start, to: section.end }))
    .on('data', function(csvrow) {
      if (header) {
        header = false;
        return;
      }

      examinations.push({
        name: locale.startsWith('de') ? csvrow[3] : csvrow[1],
        code: csvrow[0],
        createdBy: 0,
        created: Date.now(),
        modifiedBy: 0,
        modified: Date.now(),
        /* jshint ignore:start */
        backgroundColor: materialPaletts[keys[ keys.length * Math.random() << 0]]['500'],
        /* jshint ignore:end */
        color: '#FFFFFF',
        duration: possibleDurations[Math.floor(Math.random() * possibleDurations.length)]
      });
    })
    .on('end', function() {
      console.log('Finished reading from csv.');
      Examination.create(examinations, function(err, models) {
        if (err) {
          cb(err);
        } else {
          cb(null, models.length);
        }
      });
    })
    .on('error', function(error) {
      cb(error);
    });
  };

  Examination.deleteAllExaminations = function(cb) {
    Examination.destroyAll(null, function(err, info) {
      if (err) {
        cb(err);
      } else {
        cb(null, parseInt(info.count));
      }
    });
  };

  Examination.remoteMethod(
    'deleteAllExaminations',
    {
      description: 'Deletes all data.',
      http: {path: '/deleteAll', verb: 'delete'},
      returns: {arg: 'deletedCount', type: 'number'}
    }
  );

};
