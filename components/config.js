// config.js
require('dotenv').config();
module.exports = {
    BASE_URL: process.env.BASE_URL,
    USERNAME: process.env.USERNAME,
    PASSWORD: process.env.PASSWORD,
    CERT_ID: process.env.CERT_ID,
    PORT: process.env.PORT
};