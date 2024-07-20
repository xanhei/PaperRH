const express = require("express");
const chartFunc = require("./auxFunctions/api.js");
const cors = require('cors');
const WebSocket = require("ws");
require("dotenv").config();
const app = express();
const wsEndpoint = require("express-ws")(app);

let AlpacaWS = undefined;

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
  //let arr = await JSON.parse(req.query.stocks);
  //console.log(arr);
  /*res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Content-Encoding': 'none',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();*/

  console.log("Client connected");
  let arr = [];

  ws.on("message", async (message) => {
    const m = await JSON.parse(message);
    console.log(m);
    if(m.action === "s") {
      const subMsg = {
        action: "subscribe",
        bars: m.stocks
      };
      AlpacaWS.send(JSON.stringify(subMsg));
    }
    else if(m.action === "u") {
      const unSub = {
        action: "unsubscribe",
        bars: m.stocks
      };
      AlpacaWS.send(JSON.stringify(unSub));
    }
  })
  
  //if no clients are connected, create new ws, otherwise, add new clients stocks
  if(!AlpacaWS) {
    AlpacaWS = new WebSocket("wss://stream.data.alpaca.markets/v2/iex");

    //authentication process w/ Alpaca
    AlpacaWS.on("open", () => {
      const authMsg = {
        action: "auth",
        key: process.env.APCA_API_KEY_ID,
        secret: process.env.APCA_API_SECRET_KEY
      };
      AlpacaWS.send(JSON.stringify(authMsg));
      ws.send("open"); //allows client to send subscription messages without causing errors
    });
  }
  else
    ws.send("open");

  //message handler
  AlpacaWS.on("message", async (message) => {
    const m = await JSON.parse(message);
    if(m[0].T === "b") {
      //res.write(`data: ${JSON.stringify(m[0])}\n\n`);
      ws.send(m[0]);
      console.log(m[0].S)
    }
    else
      console.log(m[0]);

    //close ws connection when there are no active subscriptions
    if(m[0].T === "subscription" && !m[0].bars) {
      if(AlpacaWS)
        AlpacaWS.close();
      AlpacaWS = undefined;
      ws.end();
    }
  });

  //client connection close
  ws.on("close", () => {
    console.log("Client closed WS");
    /*const unSub = {
      action: "unsubscribe",
      bars: arr
    };
    AlpacaWS.send(JSON.stringify(unSub));*/
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
