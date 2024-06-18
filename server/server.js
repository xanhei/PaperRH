const express = require("express");
const fetchChart = require("./auxFunctions/api.js");
const cors = require('cors');
require("dotenv").config();
const app = express();

const corsOps = {
  origin: "https://paper-rh.vercel.app/*",
  optionsSuccessStatus: 200
};
app.use(cors(corsOps));

//app.use(express.json()); //allows app.post route handler to parse json

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.get("/api", async (req, res) => {
  res.send("In API directory");
});

app.get("/stocks", async (req, res) => {
  try {
    const send = await fetchChart(req.query.period, req.query.goBack, req.query.stock.toUpperCase());
    res.send(send);
  } catch(error) {
    console.error(error);
    res.send([undefined, undefined]);
  }
});

// use dynamically set PORT value (or 5000 if PORT is not set)
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`listening on port ${port}`));

