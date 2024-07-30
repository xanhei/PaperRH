const express = require("express");
const chartFunc = require("./auxFunctions/api.js");
const cors = require('cors');
const WebSocket = require("ws");
require("dotenv").config();
const {MongoClient, ServerApiVersion} = require("mongodb");
const app = express();
require("express-ws")(app);

const corsOps = {
  origin: ["https://paper-rh.vercel.app", "https://paper-rh.vercel.app/stocks"],
  optionsSuccessStatus: 200
};
app.use(cors());

//initialize db connection
const client = new MongoClient(process.env.URI, {serverApi: {version: ServerApiVersion.v1, strict: true, deprecationErrors: true}});
let db, collection;
const connect = async() => {
  try {
    await client.connect();
    //send a ping to confirm successful connection
    db = await client.db("paperdb")//.command({ping: 1});
    collection = await db.collection("userCollection");
    //const res = await collection.findOne({userID: ""}, {projection: {_id:0}});
    console.log("Connected to DB");
    //console.log(res);
  } catch(error) {
    console.log(error);
  }
}

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
//AlpacaWS.on("message", async)
const subs = {};
const openQueries = new Set();

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
  //message handler
  const mListener = async (message) => {
    const m = await JSON.parse(message);
    if(m[0].T === "b")
        ws.send(JSON.stringify(m[0]));
    else if(m[0].T !== "t")
      console.log(m[0]);
  }
  AlpacaWS.on("message", mListener);

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
    AlpacaWS.removeListener("message", mListener);
    ws.close();
  });

  ws.send("open");
});

//price checker on buy/sell
app.get("/quotes", async (req, res) => {
  //check if market is open before proceeding
  const url = "https://paper-api.alpaca.markets/v2/clock";
  const response = await fetch(url, chartFunc.fetchOptions);
  const data = await response.json();
  if(!data.is_open)
    setTimeout(() => {res.send([])}, 3000);
  else {
    //sub/unsub functions
    const checkSub = () => {
      const subMsg = {
        action: "subscribe",
        trades: [req.query.stock]
      }
      AlpacaWS.send(JSON.stringify(subMsg));
      openQueries.add(req.query.stock);
    }
    const remSub = () => {
      openQueries.delete(req.query.stock);
      const unSub = {
        action: "unsubscribe",
        trades: [req.query.stock]
      }
      AlpacaWS.send(JSON.stringify(unSub));
    }

    let med = [];
    console.log(openQueries);
    if(!openQueries.has(req.query.stock))
      checkSub();
    const forceClose = setInterval(() => {
      if(med.length > 0) {
        clearInterval(forceClose);
        if(openQueries.has(req.query.stock))
          remSub();
        AlpacaWS.removeListener("message", qListener);
        res.send(med);
      }
      else if(!openQueries.has(req.query.stock))
        checkSub();
    }, 3000);

    const qListener = async (message) => {
      const m = await JSON.parse(message);
      if(m[0].T === "t" && m[0].S === req.query.stock) {
        med.push(m[0].p);
        if(med.length >= 5) {
          clearInterval(forceClose);
          if(openQueries.has(req.query.stock))
            remSub();
          AlpacaWS.removeListener("message", qListener);
          res.send(med);
        }
      }
    }
    AlpacaWS.on("message", qListener);
  }
});

//allow client to check if market is open
app.get("/open", async (req, res) => {
  const url = "https://paper-api.alpaca.markets/v2/clock";
  const response = await fetch(url, chartFunc.fetchOptions);
  const data = await response.json();
  res.send(data.is_open);
});

//handle CRUD for users database
app.get("/users", async (req, res) => {
  //console.log(req.query);
  if(req.query.action === "create") {
    console.log("create");
  }
  else if(req.query.action === "read") {
    const account = await collection.findOne({userID: req.query.user}, {projection: {_id: 0}});
    res.send({data: account});
  }
  else if(req.query.action === "delete") {
    console.log("delete");
  }
  else
    res.send({m: "Invalid"});
});

app.put("/watchlist", async (req, res) => {
  const account = await collection.findOne({userID: req.query.user}, {projection: {_id: 0}});
  if(account) {
    const changeData = await JSON.parse(req.query.change);
    const wl = account.wl;
    const subs = account.subs;
    if(req.query.action === "add") {
      for(let i = 0; i < changeData.length; i++) {
        if(!wl.includes(changeData[i]))
          wl.push(changeData[i]);
        if(!subs.includes(changeData[i]))
          subs.push(changeData[i]);
      }
    }
    else {
      const owned = Object.keys(account.owned);
      for(let i = 0; i < changeData.length; i++) {
        if(wl.includes(changeData[i]))
          wl.splice(wl.indexOf(changeData[i]), 1);
        if(!owned.includes(changeData[i]) && subs.includes(changeData[i]))
          subs.splice(subs.indexOf(changeData[i]), 1);
      }
    }
    const updates = {$set: {wl: wl, subs: subs}};
    const result = await collection.updateOne({userID: account.userID}, updates);
    res.send({data: result});
  }
  else
    res.send({data: "Account not found"});
});

app.patch("/snapshot", async (req, res) => {});

// use dynamically set PORT value (or 5000 if PORT is not set)
const port = process.env.PORT || 5000;
connect();
app.listen(port, () => console.log(`listening on port ${port}`));
