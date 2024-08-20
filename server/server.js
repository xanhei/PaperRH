const express = require("express");
const chartFunc = require("./auxFunctions/api.js");
const cors = require('cors');
const WebSocket = require("ws");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
require("express-ws")(app);

const whitelist = ["https://paper-rh.vercel.app"];
const corsOps = {
  origin: function (origin, callback) {
    if(whitelist.indexOf(origin) !== -1)
      callback(null, true);
    else
      callback(new Error("Not allowed by CORS"));
  }, 
  credentials:true,
  optionSuccessStatus:200,
};
app.use(cors(corsOps));
app.use(cookieParser());

//initialize db connection
const {MongoClient, ServerApiVersion} = require("mongodb");
const client = new MongoClient(process.env.URI, {serverApi: {version: ServerApiVersion.v1, strict: true, deprecationErrors: true}});
let db, collection;
const connect = async() => {
  try {
    await client.connect();
    //send a ping to confirm successful connection
    db = await client.db("paperdb")
    collection = await db.collection("userCollection");
    console.log("Connected to DB");
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
AlpacaWS.on("message", async (message) => {
  const m = await JSON.parse(message);
  console.log(m);
});
const subs = {};
const openQueries = new Set();

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.get("/api", async (req, res) => {
  res.send("In API directory");
});

app.get("/dashboard", (req, res) => {
  if(!loggedIn)
    res.send({});
  else {
    res.send({data: "loggedIn"});
  }
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

app.get("/port", async (req, res) => {
  try {
    const account = await collection.findOne({userID: req.query.user}, {projection: {_id: 0}});
    if(account) {
      const send = await chartFunc.getPortData(req.query.period, Number(req.query.goBack), account);
      if(send[0])
        await collection.updateOne({userID: req.query.user}, send[0]);
      res.send(send[1]);
    }
    else
      res.send([undefined, undefined]);
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

//price checker on buy/sell
app.get("/quotes", async (req, res) => {
  //check if market is open before proceeding
  if(req.query.stock === "Portfolio") //error check
    res.send({data: "Bad Term"});
  else {
    const url = "https://paper-api.alpaca.markets/v2/clock";
    const response = await fetch(url, chartFunc.fetchOptions);
    const data = await response.json();
    if(!data.is_open)
      res.send({stock: req.query.stock, arr: []});
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

      let med = {stock: req.query.stock, arr: []};
      if(!openQueries.has(req.query.stock))
        checkSub();
      const forceClose = setInterval(() => {
        if(med.arr.length > 0) {
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
          med.arr.push(m[0].p);
          if(med.arr.length >= 5) {
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
  }
});

//allow client to check if market is open
app.get("/open", async (req, res) => {
  const url = "https://paper-api.alpaca.markets/v2/clock";
  const response = await fetch(url, chartFunc.fetchOptions);
  const data = await response.json();
  res.send(data.is_open);
});

//allow client to check last market open date
app.get("/prevOpen", async (req, res) => {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 7);
  const response = await chartFunc.findOpen(`${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`, `${end.getFullYear()}-${end.getMonth() + 1}-${end.getDate()}`);
  res.send({date: response});
});

//handle CRUD for users database
app.get("/autoLogin", async (req, res) => {
  if(!req.headers.cookie || req.headers.cookie === null) {
    return res.status(401);
  }
  try {
    const cookie = req.headers.cookie.substring(10);
    const response = await jwt.verify(cookie, process.env.JWT_SECRET);
    const account = await collection.findOne({userID: response.userID}, {projection: {_id: 0, password: 0}});

    let updates;
    [updates, account.charts] = await chartFunc.updateEachChart(account);
    await collection.updateOne({userID: account.userID}, updates);

    res.status(200).send(account);
  } catch(error) {
    console.log(error);
    res.status(401);
  }
});

app.get("/findUser", async (req, res) => {
  const account = await collection.findOne({userID: req.query.user});
  if(account && bcrypt.compareSync(req.query.password, account.password)) {
    const authToken = await chartFunc.issueAuthToken(account);
    chartFunc.issueAuthCookie(res, authToken);
    delete account.password; //only deleting password from object that is sent to client (not from database)
    delete account._id;

    let updates;
    [updates, account.charts] = await chartFunc.updateEachChart(account);
    await collection.updateOne({userID: req.query.user}, updates);
    res.send({data: account});
  }
  else
    res.send({data: false});
});

app.get("/accountInit", async (req, res) => {
  //ensure username does not already exist
  const check = await collection.findOne({userID: req.query.user});
  if(check)
    res.send({data: false});
  else {
    const startVal = 100000;
    const defaultWL = ["SPY", "AAPL", "NVDA"];
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash(req.query.password, salt);
    const account = {
      userID: req.query.user,
      password: password,
      accountValue: startVal,
      buyingPower: startVal,
      wl: defaultWL,
      owned: {},
      subs: defaultWL,
      charts: {},
      lastLogin: ""
    };

    //initialize charts
    const params = [
      ["5Min", 0, "day"],
      ["1Hour", 7, "week"],
      ["1Day", 1, "month"],
      ["1Day", 3, "month3"],
      ["1Day", 6, "month6"],
      ["1Day", 12, "year"],
    ];
    for(const p of params) {
      const data = await chartFunc.getData(p[0], p[1], "NVDA");
      for(const i in data[0])
        data[1][i] = account.accountValue;
      account.charts[p[2]] = data;
    }
    const temp = await collection.insertOne(account);
    account._id = temp.insertedId;
    const authToken = await chartFunc.issueAuthToken(account);
    chartFunc.issueAuthCookie(res, authToken);

    delete account.password;
    delete account._id;
    res.send({data: account});
  }
});

app.get("/logout", (req, res) => {
  res.clearCookie("authToken");
  res.status(200).send({});
});

app.get("/watchlist", async (req, res) => {
  const account = await collection.findOne({userID: req.query.user}, {projection: {_id: 0, password: 0}});
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

app.get("/owned", async (req, res) => {
  const account = await collection.findOne({userID: req.query.user}, {projection: {_id: 0, password: 0}});
  if(account) {
    const changeData = await JSON.parse(req.query.change);
    const owned = account.owned;
    const subs = account.subs;
    if(req.query.action === "add") {
      for(let i = 0; i < changeData.length; i++) {
        if(!owned[changeData[i][0]])
          owned[changeData[i][0]] = changeData[i][1];
        else
          owned[changeData[i][0]] += changeData[i][1];
        if(!subs.includes(changeData[i][0]))
          subs.push(changeData[i][0]);
      }
    }
    else {
      const wl = account.wl;
      for(let i = 0; i < changeData.length; i++) {
        owned[changeData[i][0]] -= changeData[i][1];
        if(owned[changeData[i][0]] <= 0)
          delete owned[changeData[i][0]];
        if(!wl.includes(changeData[i][0]))
          subs.splice(subs.indexOf(changeData[i][0]), 1);
      }
    }
    const bp = await JSON.parse(req.query.bp);
    const updates = {$set: {owned: owned, subs: subs, buyingPower: bp}};
    const result = await collection.updateOne({userID: req.query.user}, updates);
    res.send({data: result});
  }
  else
    res.send({data: "Account not found"});
});

app.get("/updatePortChart", async (req, res) => {
  const account = await collection.findOne({userID: req.query.user}, {projection: {_id: 0, password: 0}});
  if(account) {
    const charts = account.charts;
    const xData = await JSON.parse(req.query.xData), yData = await JSON.parse(req.query.yData);
    charts[req.query.chart] = [xData, yData];
    const updates = {$set: {charts: charts}};
    if(req.query.chart === "day")
      updates["$set"]["accountValue"] = yData.slice(-1)[0];
    const result = await collection.updateOne({userID: req.query.user}, updates);
    res.send({data: result});
  }
  else
    res.send({data: "Account not found"});
});

app.get("/updateLogin", async (req, res) => {
  const updates = {$set: {lastLogin: req.query.date}};
  const result = await collection.updateOne({userID: req.query.user}, updates);
  res.send({data: result});
});

app.get("/tickers", async (req, res) => {
  try {
    const term = req.query.term.toUpperCase();
    const response = await fetch(`https://api.polygon.io/v3/reference/tickers?market=stocks&limit=1000&search=${term}&apiKey=${process.env.POLYGON_KEY}`);
    const sendObj = await response.json();
    const sendArr = sendObj.results;
    if(!sendArr)
      res.send({tickers: [], names: []});
    else {
      const tickers = [], names = [];
      for(const stock of sendArr) {
        if(stock.ticker === term) {
          tickers.push(stock.ticker);
          names.push(stock.name);
          break;
        }
      }
      for(let i = tickers.length; (i < 5 && i < sendArr.length); i++) {
        tickers.push(sendArr[i].ticker);
        let tempName = sendArr[i].name;
        if(tempName.length >= 30)
          tempName = tempName.substring(0, 30) + "...";
        names.push(tempName);
      }
      res.send({tickers: tickers, names: names});
    }
  } catch(error) {
    console.log(error);
    res.send({error: error});
  }
});

// use dynamically set PORT value (or 5000 if PORT is not set)
const port = process.env.PORT || 5000;
connect();
app.listen(port, () => console.log(`listening on port ${port}`));
