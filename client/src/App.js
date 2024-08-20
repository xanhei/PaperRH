import { useState, useEffect, useRef } from 'react';
import './App.css'
import SearchIcon from "./search.svg";

//components / assets / functions
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js/auto';
import { Line } from 'react-chartjs-2';

//in house assets
import LineChart from "./components/LineChart.jsx";
import WatchList from "./components/WatchList.jsx";
import Exchange from './components/buySell.jsx';
import DropDown from "./components/menu.jsx"; //free api has limit of 5 calls/min
import LoginScreen from './components/login.jsx';
import { verticalHoverLine } from "./chartAssets/verticalLine.js";
import ctt from "./chartAssets/ctt.js";
import { focusBtn, commaFormat, percentFormat, chartSubHeader, unSubCheck, loginUpdate, formatDailyChart } from "./auxFunctions/functions.js";
import { addData, changeColor } from './chartAssets/updateData.js';
//import { baseline } from './chartAssets/baseline.js';

import { ChartData, ChartClass, defaultOptions, fetchOptions, defaultAccount } from "./Data.js" // NEED TO SPECIFY ".js" FOR NAMED EXPORT

//variables to fetch market data
const url = "https://data.alpaca.markets/v2/stocks/bars";
const params = "?sort=asc";
let ws;
let focus = ""; //used for case where exchange of stock occurs when user does not have that stock in focus (state is not updated in the handler function)
let tempColor; //used because chartSubHeader function runs before chartSubHead element loads

//test parameters to be changed later
const defaultSearch = "SPY";
let wl = []; //watchlist
let subs = []; //subs list
let owned = {}; //stocks list
let ownedList = []; //because if you try to use Object.keys, react freaks out and rerenders the whole damn watchlist whenever any state is updated (see Stocks watchlist)
let tempSub = ""; //used to correctly unsub from a stock when user unloads while on individual stock screen that is not in subs list
let account;
let menuTimeout; //prevent unnecessary queries to polygon.io api (for menu dropdown tickers)

function App() {
  const [chartData, setChartData] = useState(); //data drawn on chart
  const [searchTerm, setSearchTerm] = useState(""); //term used to fetch data for correct stock
  const [frameState, setFrameState] = useState("5Min"); //bar size that needs to be fetched
  const [start, setStart] = useState(0); //least recent day used to fetch data
  const [currPrice, setCurrPrice] = useState(0); //most recent price
  const [showPrice, setShowPrice] = useState(); //display price
  const [portView, setPortView] = useState(true); //whether current view is portfolio (set to true) or a stock (set to false)
  const [basePrice, setBasePrice] = useState(); //used for price change calculation
  const [loggedIn, setLoggedIn] = useState(false);
  const [buyPower, setBuyPower] = useState(100000);
  const [tickers, setTickers] = useState([]); //used for dropdown search menu
  const [names, setNames] = useState([]); //used for dropdown search menu

  //unhover listener (couldn't find out how to import correctly)
  const unHover = {
    id: "unHover",
    beforeEvent(chart, args) {
      const event = args.event;
      if(event.type === "mouseout")
        setShowPrice(undefined);
    }
  }
 
  //creating chartref for onHover event
  let ops = defaultOptions;
  ops.onHover = (e, arr) => {
    if(arr.length > 0)
      setShowPrice(commaFormat(arr[0].element.$context.raw));
  }

  //function for setting chart data parameters
  const focusChart = async (timeframe, goBack, term, pv = portView) => {
    tempSub = term;
    let xData, yData, bp;
    if(pv) {
      const response = await fetch(`${process.env.REACT_APP_EXPRESS_URL}port?user=${account.userID}&period=${timeframe}&goBack=${goBack}`);
      try {
        [xData, yData] = await response.json();
      } catch(error) {
        console.log(response);
      }
      setSearchTerm("Portfolio");
      if(yData) {
        if(timeframe === "5Min") {
          const now = new Date();
          let i = 1;
          if(now.getHours() < 4 || now.getHours() >= 16)
            i++;
          bp = account.charts["month"][1][account.charts["month"][1].length - i];
        }
        else
          bp = yData[0];
      }
    }
    else {
      const response = await fetch(`${process.env.REACT_APP_EXPRESS_URL}stocks?stock=${term}&period=${timeframe}&goBack=${goBack}`);
      [xData, yData] = await response.json();
    }
    if(xData && xData.length > 0) {
      if(timeframe === "5Min")
        formatDailyChart(xData);
      if(!pv) {
        if(timeframe === "5Min") {
          const a = await fetch(`${process.env.REACT_APP_EXPRESS_URL}percent?stock=${term}`);
          const res = await a.json();
          bp = res[0].bars[term][0].c;
        }
        else
          bp = yData[0];
      }
      const color = yData[yData.length - 1] >= bp ? "rgb(31, 217, 22)" : "rgb(242, 80, 5)";
      tempColor = color;
      setBasePrice(bp);
      setCurrPrice(commaFormat(yData[yData.length - 1]));
      setShowPrice(commaFormat(yData[yData.length - 1]));
      setChartData(new ChartClass(xData, yData, color));
    }
    else {
      setChartData(undefined);
      setShowPrice("0.00")
    }
  }

  //functions that change chart and state variables
  const btnClick = (timeframe, goBack) => {
    focusBtn(".timeButton", true);
    setFrameState(timeframe);
    setStart(goBack);
    focusChart(timeframe, goBack, searchTerm);
  }

  const newSearch = (stock) => {
    //unSubCheck(subs, searchTerm, ws);
    if(!stock)
      stock = document.querySelector(".searchBar").value.toUpperCase();
    if(stock === "")
      return;
    focus = stock;
    setSearchTerm(stock);
    setPortView(false);
    setTickers([]);
    setNames([]);
    const st = document.querySelector(".searchBar").value = "";
    //if(!subs.includes(st))
      //ws.send(JSON.stringify({action: "s", stocks: [st]}));
    focusChart(frameState, start, stock, false);
  }

  const findTickers = () => {
    const st = document.querySelector(".searchBar").value;
    if(st === "") {
      clearTimeout(menuTimeout);
      setTickers([]);
      setNames([]);
      return;
    }
    clearTimeout(menuTimeout);
    const endBuffer = async () => {
      const response = await fetch(`${process.env.REACT_APP_EXPRESS_URL}tickers?term=${st}`);
      const res = await response.json();
      setTickers(res.tickers);
      setNames(res.names);
    }
    menuTimeout = setTimeout(endBuffer, 750);
  }

  const wlUpdate = (stock) => {
    focus = stock;
    setSearchTerm(stock);
    setPortView(false);
    focusChart(frameState, start, stock, false);
  }

  const updatePort = (shares, price, buy, stock) => {
    if(buy) {
      const bp = Number((Number(buyPower) - shares * price).toFixed(2));
      setBuyPower(bp);
      fetch(`${process.env.REACT_APP_EXPRESS_URL}owned?user=${account.userID}&action=add&change=${JSON.stringify([[stock, shares]])}&bp=${JSON.stringify(bp)}`);
      if(owned[stock] === undefined) {
        owned[stock] = shares;
        ownedList.push(stock);
        if(!subs.includes(stock)) { //add to subs if stock is not currently on watchlist
          subs.push(stock);
          //if(stock !== focus) //stock has been purchased, but user has clicked home / search
            //ws.send(JSON.stringify({action: "s", stocks: [stock]}))
        }
      }
      else
        owned[stock] += shares;
    }
    else {
      const bp = Number((Number(buyPower) + shares * price).toFixed(2));
      setBuyPower(bp);
      owned[stock] -= shares;
      fetch(`${process.env.REACT_APP_EXPRESS_URL}owned?user=${account.userID}&action=remove&change=${JSON.stringify([[stock, shares]])}&bp=${bp}`);
      if(owned[stock] === 0) {
        delete owned[stock];
        ownedList.splice(ownedList.indexOf(stock), 1);
        if(!wl.includes(stock)) { //remove from subs if stock is not currently on watchlist
          subs.splice(subs.indexOf(stock), 1);
          //if(stock !== focus) //stock has been sold, but user has clicked home /search
            //unSubCheck(subs, stock, ws);
        }
      }
    }
  }

  //loginscreen functions
  const loginCheck = async (user, pass, newAcct) => {
    if(user === "" || pass === "")
      return "Please fill out both fields";
    if(newAcct) {
      const response = await fetch(`${process.env.REACT_APP_EXPRESS_URL}accountInit?user=${user}&password=${pass}`);
      const res = await response.json();
      if(!res.data)
        return `User "${user}" already exists`;
      account = res.data;
    }
    else {
      const response = await fetch(`${process.env.REACT_APP_EXPRESS_URL}findUser?user=${user}&password=${pass}`);
      const res = await response.json();
      if(!res.data)
        return "Username or password are incorrect";
      account = res.data;
    }
    [wl, subs, owned] = [account.wl, account.subs, account.owned];
    ownedList = Object.keys(owned);
    setBuyPower(account.buyingPower);
    setLoggedIn(true);
    return "";
  }

  const logout = async () => {
    const options = {method: "GET", credentials: "include"};
    await fetch(`${process.env.REACT_APP_EXPRESS_URL}logout`, options)
    account = undefined;
    [wl, owned, ownedList, subs] = [[], {}, [], []];
    setTickers([]);
    setChartData(undefined);
    setLoggedIn(false);
  }

  /*const autoLogin = async () => {
    const options = {method: "GET", credentials: "include"};
    const response = await fetch(`${process.env.REACT_APP_EXPRESS_URL}autologin`, options);
    if(response.status === 200) {
      const res = await response.json();
      account = res;
      [wl, subs, owned] = [account.wl, account.subs, account.owned];
      ownedList = Object.keys(owned);
      setBuyPower(account.buyingPower);
      setLoggedIn(true);
    }
  }

  useEffect(() => {autoLogin()}, []);*/

  return (
    <>{ !loggedIn ? <LoginScreen login={(user, pass, newAcct) => loginCheck(user, pass, newAcct)}></LoginScreen> :
      <div className="app">
          <div className="head">
            <h1 className="homeBtn" onClick={() => {
              //unSubCheck(subs, searchTerm, ws);
              focus = "";
              focusChart(frameState, start, defaultSearch, true);
              setPortView(true);
            }}>Home</h1>
            <div className="search">
              <input className="searchBar" placeholder="Search" spellCheck="false" onChange={() => findTickers()}></input>
              <img className="searchIcon" src={SearchIcon} alt="search" onClick={() => newSearch()}></img>
              {tickers.length > 0 ? <DropDown tickers={tickers} names={names} click={(stock) => newSearch(stock)}></DropDown> : <></>}
            </div>
            <button className="logout" onClick={() => logout()}>Sign out</button>
          </div>
        <div className="main">
          <div className="chartDiv">
            <h1 className="chartText">{searchTerm}</h1>
            <h1 className="chartText">${showPrice ? showPrice : currPrice}</h1>
            {
              chartData !== undefined ?
              <>
                {basePrice ? <p className="chartSubHead" style={{color: tempColor}}>{chartSubHeader(basePrice, showPrice ? showPrice : currPrice)}</p> : <p></p>}
                <LineChart name="portChart" stock={searchTerm} chartData={chartData.data} options={ops} plugins={[verticalHoverLine, unHover]}></LineChart>
              </> :
              <h2>Chart data not found for ${searchTerm}</h2>
            }
            <div className="buttonDiv">
              <button className="timeButton" autoFocus onFocus={() => btnClick("5Min", 0)}>1D</button>
              <button className="timeButton" onFocus={() => btnClick("1Hour", 7)}>1W</button>
              <button className="timeButton" onFocus={() => btnClick("1Day", 1)}>1M</button>
              <button className="timeButton" onFocus={() => btnClick("1Day", 3)}>3M</button>
              <button className="timeButton" onFocus={() => btnClick("1Day", 6)}>6M</button>
              <button className="timeButton" onFocus={() => btnClick("1Day", 12)}>1Y</button>
            </div>
            <hr className="line"></hr>
            {portView ? <h3>Buying Power: ${commaFormat(buyPower)}</h3> : <h3>Shares: {owned[searchTerm] || 0}</h3>}
          </div>
          <div className="SidePanel">
            {
              portView ?
              <>
                {
                  ownedList.length > 0 ?
                    <WatchList title="Stocks" stocks={ownedList} count={owned} click={(stock) => wlUpdate(stock)}></WatchList> : <></>
                }
                {<WatchList title="Watchlist" stocks={wl} click={(stock) => wlUpdate(stock)}></WatchList>}
              </> :
              <>
              {
                chartData !== undefined ?
                <Exchange className="Exchange" stock={searchTerm} marketPrice={currPrice} contains={wl.includes(searchTerm)} stake={owned[searchTerm] || 0} bp={buyPower}
                          action={(shares, price, buy, stock) => updatePort(shares, price, buy, stock)} wlChange={() => {
                  //remove if wl contains stock
                  if(wl.includes(searchTerm)) {
                    wl.splice(wl.indexOf(searchTerm), 1);
                    if(owned[searchTerm] === undefined) //remove from permanent subs if user does not own stock
                      subs.splice(subs.indexOf(searchTerm), 1);
                    //remove from database
                    fetch(`${process.env.REACT_APP_EXPRESS_URL}watchlist?user=${account.userID}&action=remove&change=${JSON.stringify([searchTerm])}`);
                  }
                  //add if wl does not contain stock
                  else {
                    if(subs.length < 25) {
                      wl.push(searchTerm);
                      if(owned[searchTerm] === undefined) //add to permanent subs if user does not own stock
                        subs.push(searchTerm);
                      //add to database
                      fetch(`${process.env.REACT_APP_EXPRESS_URL}watchlist?user=${account.userID}&action=add&change=${JSON.stringify([searchTerm])}`);
                    }
                    else {
                      alert("Max Watchlist size is 25");
                      return false;
                    }
                  }
                  return true;
                }}></Exchange> :
                <></>
              }
              </>
            }
          </div>
        </div>
      </div>
    }</>
  );
}

export default App;
