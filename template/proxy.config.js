var config = {
  'GET /api/system/test': {
    name: 'mary',
    age: 12344,
  },
  'GET /api/(.*)': 'http://localhost:8000/admin',
}

module.exports = config;
