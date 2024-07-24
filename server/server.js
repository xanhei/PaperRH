const express = require("express");
const chartFunc = require("./auxFunctions/api.js");
const cors = require('cors');
const WebSocket = require("ws");
require("dotenv").config();
const app = express();
require("express-ws")(app);

//init
let AlpacaWS = new WebSocket("wss://stream.data.alpaca.markets/v2/iex");
AlpacaWS.on("open", () => {
  const authMsg = {
    action: "auth",
    key: process.env.APCA_API_KEY_ID,
    secret: process.env.APCA_API_SECRET_KEY
  };
  AlpacaWS.send(JSON.stringify(authMsg));
});
//message handler
AlpacaWS.on("message", async (message) => {
  const m = await JSON.parse(message);
  if(m[0].T === "b")
    ws.send(JSON.stringify(m[0]));
  else
    console.log(m[0]);
});
const subs = {};

const corsOps = {
  origin: ["https://paper-rh.vercel.app", "https://paper-rh.vercel.app/stocks"],
  optionsSuccessStatus: 200
};
app.use(cors());

//app.use(express.json()); //allows app.post route handler to parse json

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.get("/api", async (req, res) => {
  res.send("In API directory");
});

//historical stock data (15min delay)
app.get("/stocks", async (req, res) => {
  try {
    const send = await chartFunc.getData(req.query.period, req.query.goBack, req.query.stock.toUpperCase());
    res.send(send);
  } catch(error) {
    console.error(error);
    res.send([undefined, undefined]);
  }
});

app.get("/percent", async (req, res) => {
  try {
    const send = [await chartFunc.percentChange(req.query.stock)];
    res.send(send);
  } catch(error) {
    console.error(error);
    res.send(undefined);
  }
});

//minute bars (up to date)
app.ws("/ws", async (ws, req) => {
  console.log("Client connected");
  //let arr = [];

  ws.on("message", async (message) => {
    const m = await JSON.parse(message);
    console.log(m);
    if(m.action === "s") {
      let subArr = [];
      for(let i = 0; i < m.stocks.length; i++) {
        if(subs[m.stocks[i]] === undefined) {
          subs[m.stocks[i]] = 1;
          subArr.push(m.stocks[i]);
        }
        else
          subs[m.stocks[i]]++;
      }
      if(subArr.length > 0) {
        const subMsg = {
          action: "subscribe",
          bars: subArr
        };
        AlpacaWS.send(JSON.stringify(subMsg));
      }
    }
    else if(m.action === "u") {
      let unSubArr = [];
      for(let i = 0; i < m.stocks.length; i++) {
        if(--subs[m.stocks[i]] <= 0) {
          subs[m.stocks[i]] = undefined;
          unSubArr.push(m.stocks[i]);
        }
      }
      if(unSubArr.length > 0) {
        const unSub = {
          action: "unsubscribe",
          bars: unSubArr
        };
        AlpacaWS.send(JSON.stringify(unSub));
      }
    }
  });
  



  //client connection close
  ws.on("close", () => {
    console.log("Client closed WS");
    ws.close();
  });

  ws.send("open");
});

//price checker on buy/sell
/*app.get("/quotes", async (req, res) => {
  let avg = [];
  const subMsg = {
    action: "subscribe",
    quotes: req.stock
  }
  const unSub = {
    action: "unsubscribe",
    quotes: req.stock
  }
  setTimeout(() => {
    AlpacaWS.send(JSON.stringify(unSub));
    res.send(avg);
  }, 3000);
  AlpacaWS.send(JSON.stringify(subMsg));
  AlpacaWS.on("message", async (message) => {
    const m = await message.json();
    if(m.T === "q") {
      console.log("q");
      avg.push(m.ap);
      if(avg.length >= 5) {
        AlpacaWS.send(JSON.stringify(unSub));
        res.send(avg);
      }
    }
  });
});

//allow client to check if market is open
app.get("/open", async (req, res) => {
  const url = "https://paper-api.alpaca.markets/v2/clock";
  const response = await fetch(url, chartFunc.fetchOptions);
  const data = await response.json();
  res.send(data.is_open);
});*/

// use dynamically set PORT value (or 5000 if PORT is not set)
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`listening on port ${port}`));
