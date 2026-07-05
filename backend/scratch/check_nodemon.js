const http = require('http');
http.get('http://localhost:5001/health', (res) => {
  console.log('Status:', res.statusCode);
}).on('error', (e) => {
  console.error('Error:', e.message);
});
