# medical-appointment-scheduling-server

[![Greenkeeper badge](https://badges.greenkeeper.io/sebastianhaas/medical-appointment-scheduling-server.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/sebastianhaas/medical-appointment-scheduling-server.svg?branch=master)](https://travis-ci.org/sebastianhaas/medical-appointment-scheduling-server)
[![Join the chat at https://gitter.im/sebastianhaas/medical-appointment-scheduling](https://badges.gitter.im/sebastianhaas/medical-appointment-scheduling.svg)](https://gitter.im/sebastianhaas/medical-appointment-scheduling?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Dependency Status](https://david-dm.org/sebastianhaas/medical-appointment-scheduling-server.svg)](https://david-dm.org/sebastianhaas/medical-appointment-scheduling-server)
[![Node Security Platform](https://nodesecurity.io/orgs/medical-appointment-scheduling/projects/8f9025c1-1e52-486a-9713-9bf443554d6f/badge)](https://nodesecurity.io/orgs/medical-appointment-scheduling/projects/8f9025c1-1e52-486a-9713-9bf443554d6f)

This is a backend for [sebastianhaas/medical-appointment-scheduling](https://github.com/sebastianhaas/medical-appointment-scheduling) built with loopback (express).

## Features
* Actively maintained
* Provides data models required for [sebastianhaas/medical-appointment-scheduling](https://github.com/sebastianhaas/medical-appointment-scheduling)
* REST API
 * including a web-based API explorer mounted at http://0.0.0.0:3000/explorer
 * produces swagger API defintion
* WebSocket for CTI (Computer Telephony Integration) support using [CantyCTI](https://github.com/sebastianhaas/cantycti)
* Unit tested
* Rich test data generation

## Local setup
Clone this repository and run 
```shell
$ npm install
```
with a postgres database set up according to the [`datasources.json`](https://github.com/sebastianhaas/medical-appointment-scheduling-server/blob/master/server/datasources.json) config file running, start the server using
```shell
$ npm start
```
You might want to set up a dummy mail server for Email notification to work locally. Configuration can be found in [`datasources.json`](https://github.com/sebastianhaas/medical-appointment-scheduling-server/blob/master/server/datasources.json).

Browse to http://localhost:3000/explorer to take a look on the API using the explorer. Test data can be added using the respective endpoints:
```shell
# Start with:
post /Examinations/insertTestData
post /Patients/insertTestData
post /Rooms/insertTestData

# Afterwards:
post /appointments/generateRandomAppointments 

# And finally:
post /Attendances/generateRandomAttendances
```
Some of these endpoints have an optional `locale` parameter to generate test data appropriate for a specific locale (currently only `de` and `en`). Just use the API explorer to find out about it.

## Demo application
The latest master of this repository is always published to [Heroku](https://scheduling-server.herokuapp.com/). You can either use the [API directly](https://scheduling-server.herokuapp.com/api/patients), browse the [API explorer](https://scheduling-server.herokuapp.com/explorer) or take a [look through the frontend](https://scheduling-client.herokuapp.com).

Due to the limitations of Heroku's free dynos and database service, it might take a while for the application to load initially. Also, there is a 10k row limit for free databases. Sometimes you might have to wipe test data other users created before being able to add new content.
