# eyebrow

Create a valid certificate and private key in `test`, then run:

```
npm install
npm test
node --trace-warnings start.js -s 3000 -p 8000 -r test/config/certificate.pem -k test/config/private.key -e test/theme -t test/template -c test/content -g test/gzip
```
