module.exports = {
  postgresql: {
    url: process.env.DATABASE_URL + '?ssl=true',
    debug: false,
    ssl: true
  },
  sparkpost: {
    name: 'sparkpost',
    connector: 'mail',
    transports: [
      {
        type: 'SMTP',
        host: process.env.SPARKPOST_SMTP_HOST,
        secureConnection: true,
        port: process.env.SPARKPOST_SMTP_PORT,
        auth: {
          user: process.env.SPARKPOST_SMTP_USERNAME,
          pass: process.env.SPARKPOST_SMTP_PASSWORD
        }
      }
    ]
  }
};
