module.exports = {
  port: process.env.PORT,
  clientAutoAppointmentAcceptEndpoint:
    'https://scheduling-client.herokuapp.com/appointment/accept/',
  autoAppointmentFromAddress:
    '\'Auto-Appointment Service\' <auto-appointment@sebastianhaas.online>',
  autoAppointmentReplyToAddress:
    '\'Patient Service\' <patient-service@sebastianhaas.online>',
  reminderFromAddress:
    '\'Reminder Service\' <reminders@sebastianhaas.online>',
  reminderReplyToAddress:
    '\'No-Reply\' <no-reply@sebastianhaas.online>'
};
