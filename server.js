const express = require("express");
const app = express();
const path = require("path");
const ppcp_api = require("./routes/ppcp_api");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use('/ppcp_api', ppcp_api);
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "public/html", "index.html"));
});
app.get('/new_customer.html', (req, res) => {
  res.sendFile(path.join(__dirname, "public/html", "new_customer.html"));
});
app.get('/returning_customer.html', (req, res) => {
  res.sendFile(path.join(__dirname, "public/html","returning_customer.html"));
});

app.listen(3000, '0.0.0.0', () => console.log("Listening on port 3000"));

module.exports = app;