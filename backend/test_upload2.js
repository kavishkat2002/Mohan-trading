const fs = require('fs');
const path = require('path');

const fileContent = Buffer.from('hello world');
fs.writeFileSync('test1.jpg', fileContent);
fs.writeFileSync('test2.jpg', fileContent);

const FormData = require('form-data');
const form = new FormData();
form.append('brand', 'Test Car');
form.append('price', '1000');
form.append('category', 'Sedan');
form.append('stock', '1');
form.append('image', fs.createReadStream('test1.jpg'));
form.append('additional_images', fs.createReadStream('test1.jpg'));
form.append('additional_images', fs.createReadStream('test2.jpg'));

form.submit('http://localhost:5001/api/vehicles', function(err, res) {
  if (err) {
    console.error('Error:', err);
    return;
  }
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(res.statusCode, body));
});
