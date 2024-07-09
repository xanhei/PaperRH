const express = require("express");
const fetchChart = require("./auxFunctions/api.js");
const cors = require('cors');
const WebSocket = require("ws");
require("dotenv").config();
const app = express();

let ws = undefined;

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
    const send = await fetchChart(req.query.period, req.query.goBack, req.query.stock.toUpperCase());
    res.send(send);
  } catch(error) {
    console.error(error);
    res.send([undefined, undefined]);
  }
});

//minute bars (up to date)
app.get("/ws", async (req, res) => {
  //const arr = await JSON.parse(res.query.stocks);
  let arr = await JSON.parse(req.query.stocks);
  console.log(arr);
  
  //if no clients are connected, create new ws, otherwise, add new clients stocks
  if(!ws) {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Content-Encoding': 'none',
      'Connection': 'keep-alive'
    });
    res.flushHeaders();

    console.log("Client connected");

    ws = new WebSocket("wss://stream.data.alpaca.markets/v2/iex");

    //authentication process w/ Alpaca
    ws.on("open", () => {
      const authMsg = {
        action: "auth",
        key: process.env.APCA_API_KEY_ID,
        secret: process.env.APCA_API_SECRET_KEY
      };
      ws.send(JSON.stringify(authMsg));

      const subMsg = {
        action: "subscribe",
        bars: arr
      };
      ws.send(JSON.stringify(subMsg));
    });
  }
  else {
    const subMsg = {
      action: "subscribe",
      bars: arr
    };
    ws.send(JSON.stringify(subMsg));
  }

  //message handler
  ws.on("message", async (message) => {
    const m = await JSON.parse(message);
    if(m[0].T === "b")
      res.write(`data: ${JSON.stringify(m[0])}\n\n`);
    else
      console.log(m[0]);

    //close ws connection when there are no active subscriptions
    if(m[0].T === "subscription" && !m[0].bars) {
      ws.close();
      ws = undefined;
      res.end();
    }
  });

  //client connection close
  res.on("close", () => {
    console.log("Client closed SSE");
    const unSub = {
      action: "unsubscribe",
      bars: arr
    };
    ws.send(JSON.stringify(unSub));
  });
});

app.get("/abc", (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Content-Encoding': 'none',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();
  
  const send = () => {
    const msg = {S: "SPY", c: "540.00"};
    res.write(`data: ${JSON.stringify(msg)}\n\n`);
  }

  console.log("abc connected");
  const t = setInterval(() => send(), 5000);
  res.on("close", () => {
    console.log("Client closed connection");
    clearInterval(t);
    res.end();
  });
});

// use dynamically set PORT value (or 5000 if PORT is not set)
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`listening on port ${port}`));
