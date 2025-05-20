// server.js
const express = require("express");
const bodyParser = require("body-parser");
const handleUssd = require("./ussd");

const app = express();
require("dotenv").config();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post("/ussd", handleUssd);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`USSD app running on port ${port}`);
});
