module.exports = {
  postgresql: {
    url: process.env.DATABASE_URL + '?ssl=true',
    debug: false,
    ssl: true
  }
};
