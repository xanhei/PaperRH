require('dotenv').config();
const jwt = require("jsonwebtoken");

const fetchOptions = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    "APCA-API-KEY-ID": process.env.APCA_API_KEY_ID,
    "APCA-API-SECRET-KEY": process.env.APCA_API_SECRET_KEY,
  },
};

//main function used to query alpaca api for data
const getData = async (timeframe, goBack, term) => {
  const url = "https://data.alpaca.markets/v2/stocks/bars";
  const params = "?sort=asc";

  //find correct start date
  let today = new Date();
  let checkDate = new Date(
    Number(today.getFullYear()),
    (goBack != 7) ? Number(today.getMonth()) - goBack : Number(today.getMonth()),
    (goBack == 7 || goBack == 0) ? Number(today.getDate()) - 7 : Number(today.getDate()),
  );
  dateURL = checkDate.toISOString();
  dateURL = dateURL.substring(0, 10);
  if(goBack == 0)
    dateURL = await findOpen(checkDate, today);
  if(!dateURL)
    return [undefined, undefined];
  const response = await fetch(url + params + `&symbols=${term}` + `&timeframe=${timeframe}` + `&start=${dateURL}`, fetchOptions)
  const res = await response.json();

  //set filter variable for daily/weekly charts
  let baseDate;
  if(goBack == 0)
    baseDate = today;
  else if(goBack == 7)
    baseDate = checkDate;

  //set chart data if response is ok
  if(res.bars && res.bars[term]) {
    let xData = await new Promise((resolve) => {
      resolve(
        (timeframe === "1Day") ? res.bars[term].map((bar) => formatTime(bar.t, timeframe)) : ltdTimeFormat(res.bars[term], baseDate, timeframe === "5Min")
      );
    });
    let yData = await new Promise((resolve) => {
      resolve(
        (timeframe === "1Day") ? res.bars[term].map((bar) => Number(bar.c)) : ltdPriceFormat(res.bars[term], baseDate, timeframe === "5Min")
      );
    });
    return [xData, yData];
  }
  else
    return [undefined, undefined];
}

//function used to show % change of a stock on daily view
const percentChange = async (term) => {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 7);
  const fetchDate = await findOpen(start, end, true);
  let params = `?sort=asc&symbols=${term}&timeframe=1Day&start=${fetchDate}&end=${fetchDate}`;
  const response = await fetch(`https://data.alpaca.markets/v2/stocks/bars${params}`, fetchOptions);
  const res = await response.json();
  return res;
}

/* aux functions used by getData() */

//function to find the most recent market open if current day is market holiday (for 1D)
const findOpen = async (startDate, endDate, percent = false) => {
  const url = "https://paper-api.alpaca.markets/v2/calendar";
  const startString = `${startDate.getFullYear()}-${startDate.getMonth() + 1}-${startDate.getDate()}`;
  const endString = `${endDate.getFullYear()}-${endDate.getMonth() + 1}-${endDate.getDate()}`
  const response = await fetch(`${url}?start=${startString}&end=${endString}`, fetchOptions);
  const res = await response.json();
  const today = new Date();
  if(!res || !res[res.length - 1])
    return;
  const wait = (today.toISOString().substring(0, 10) === res[res.length - 1].date && (today.getHours() < 4));//(today.getHours() < 9 || today.getHours() === 9 && today.getMinutes() < 30));
  const i = percent ? 1 : 0;
  return wait ? res[res.length - 2 - i].date : res[res.length - 1 - i].date;
}

//formats time to display on chart tooltip
const formatTime = (s, timeframe) => { //s --> 2024-01-01T00:00:00Z
  if(timeframe === "1Day") {
    let i = (Number(s.substring(5, 7)) < 10) ? 6 : 5;
    let j = (Number(s.substring(8, 10)) < 10) ? 9 : 8;
    return `${s.substring(i, 7)}-${s.substring(j, 10)}-${s.substring(0, 4)}`;
  }
  else {
    let date = new Date(s);
    const timeString = date.toLocaleTimeString("en-US", {timeZone: "America/New_York"});
    let time, half;
    if(timeString[1] == ":") {
      time = timeString.substring(0, 4);
      half = timeString.substring(8, 10);
    }
    else {
      time = timeString.substring(0, 5);
      half = timeString.substring(9, 11);
    }

    //format date
    let prefix = "";
    if(timeframe === "1Hour") {
      prefix = `${date.getMonth() + 1}-${date.getDate()}, `;
    }
    return `${prefix}${time} ${half}`;
  }
}

//formatting for bars that are less than a day
//filters out extra bars
//formats close of last bar
const ltdTimeFormat = (arr, baseDate, isMinBar) => {
  let res = [];
  if(isMinBar) {
    for(let i = 0; i < arr.length; i++) {
      const dateCheck = new Date(arr[i].t);
      if(baseDate.getDate() !== dateCheck.getDate())
        continue;
      res.push(formatTime(arr[i].t));
    }

    //ensure correct formatting of time on last bar's close
    const minutes = (Number(arr[arr.length - 1].t.substring(14, 16)) + 5) % 60;
    const nextHour = (minutes == 0) ? 1 : 0;
    const hours = (Number(arr[arr.length - 1].t.substring(11, 13)) + nextHour) % 24;
    let tempString = `${(hours < 10) ? "0" + hours : hours}:${(minutes < 10) ? "0" + minutes : minutes}`
    let formatString = arr[arr.length - 1].t.substring(0, 11) + tempString + ":00Z";
    if(formatString.substring(14, 16) !== "05") //do not display close of 8:05 PM
      res.push(formatTime(formatString));
  }
  else {
    for(let i = 0; i < arr.length; i++) {
      const dateCheck = new Date(arr[i].t);

      const invalidDay = (dateCheck.getDate() < baseDate.getDate() && dateCheck.getMonth() === baseDate.getMonth());
      const invalidMonth = (dateCheck.getMonth() < baseDate.getMonth() || (dateCheck.getMonth() === 11 && baseDate.getMonth === 0));
      const invalidDate =  invalidDay || invalidMonth;

      if(dateCheck.getHours() > 19 || invalidDate)
        continue;
      res.push(formatTime(arr[i].t, "1Hour"));
      if(dateCheck.getHours() === 19) {
        let prefix = `${dateCheck.getMonth() + 1}-${dateCheck.getDate()},`;
        res.push(`${prefix} 8:00 PM`);
      }
    }
  }
  return res;
}

const ltdPriceFormat = (arr, baseDate, isMinBar) => {
  let res = [];
  if(isMinBar) {
    for(let i = 0; i < arr.length; i++) {
      const dateCheck = new Date(arr[i].t);
      if(baseDate.getDate() !== dateCheck.getDate())
        continue;
      res.push(Number(arr[i].o));
    }

    //always append the close of the last bar
    res.push(Number(arr[arr.length - 1].c));
  }
  else {
    for(let i = 0; i < arr.length; i++) {
      const dateCheck = new Date(arr[i].t);

      const invalidDay = (dateCheck.getDate() < baseDate.getDate() && dateCheck.getMonth() === baseDate.getMonth());
      const invalidMonth = (dateCheck.getMonth() < baseDate.getMonth() || (dateCheck.getMonth() === 11 && baseDate.getMonth === 0));
      const invalidDate =  invalidDay || invalidMonth;

      if(dateCheck.getHours() > 19 || invalidDate)
          continue;
      res.push(Number(arr[i].o));
      if(dateCheck.getHours() === 19)
        res.push(Number(arr[i].c));
    }
  }
  return res;
}


//PORTFOLIO FUNCTIONS

//compare 2 time points (used by getPortData), returns a <= b
//day -> "XX:XX _M", week -> "MM-DD, XX:XX _M", else -> "MM-DD-YYYY"
const timeLTE = (a, b, type) => {
  if(type === "day") {
    const aItr = a.length === 7 ? 1 : 2;
    const bItr = b.length === 7 ? 1 : 2;
    let [aHour, aMin] = [Number(a.substring(0, aItr)), Number(a.substring(aItr + 1, aItr + 3))];
    let [bHour, bMin] = [Number(b.substring(0, bItr)), Number(b.substring(bItr + 1, aItr + 3))];
    if(aHour !== 12 && a.substring(a.length - 2) === "PM")
      aHour += 12;
    if(bHour !== 12 && b.substring(b.length - 2) === "PM")
      bHour += 12;
    if(aHour === bHour) {
      return aMin <= bMin;
    }
    return aHour < bHour;
  }
  else if(type === "week") {
    const aPivot = a.indexOf('-'), bPivot = b.indexOf('-'); //used to find months/days
    const aSpace = a.indexOf(' ') + 1, bSpace = b.indexOf(' ') + 1; //used to find beginning of hours
    const aMonth = Number(a.substring(0, aPivot)), bMonth = Number(b.substring(0, bPivot));
    const aDay = Number(a.substring(aPivot + 1, a.indexOf(','))), bDay = Number(b.substring(bPivot + 1, b.indexOf(',')));
    let aHour = Number(a.substring(aSpace, a.indexOf(':'))), bHour = Number(b.substring(bSpace, b.indexOf(':')));
    if(aHour !== 12 && a.substring(a.length - 2) === "PM")
      aHour += 12;
    if(bHour !== 12 && b.substring(b.length - 2) === "PM")
      bHour += 12;
    if(aMonth === 12 && bMonth === 1 || aMonth === 1 && bMonth === 12)
      return aMonth > bMonth;
    if(aMonth === bMonth) {
      if(aDay === bDay)
        return aHour <= bHour;
      return aDay < bDay;
    }
    return aMonth < bMonth;
  }
  else {
    const aPivot = a.indexOf('-'), bPivot = b.indexOf('-');
    const [aMonth, aDay, aYear] = [a.substring(0, aPivot), a.substring(aPivot + 1, a.length - 5), a.substring(a.length - 4)];
    const [bMonth, bDay, bYear] = [b.substring(0, bPivot), b.substring(bPivot + 1, b.length - 5), b.substring(b.length - 4)];
    if(aYear === bYear) {
      if(aMonth === bMonth)
        return aDay <= bDay;
      return aMonth < bMonth;
    }
    return aYear < bYear;
  }
}

//getData for portfolio (from database)
const getPortData = async (timeframe, goBack, account) => {
  let itr;
  const updates = {$set: {}};
  const end = new Date();
  //select chartType and data from chart
  const select = {0: "day", 7: "week", 1: "month", 3: "month3", 6: "month6", 12: "year"};
  const chartType = select[goBack];
  let [xData, yData] = account.charts[chartType];
  //fetch dummy time array
  const [compX, compY] = await getData(timeframe, goBack, "NVDA");//fetch(`${process.env.REACT_APP_EXPRESS_URL}stocks?stock=NVDA&period=${timeframe}&goBack=${goBack}`);
  if(chartType === "day") {
    //get db data and compare times with most recent times
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 7);
    const checkDate = await findOpen(start, end);
    if(!checkDate)
      return [undefined, undefined];
    //if last time data was updated was >1Day, clear current db data, else concat data where necessary
    if(account.lastLogin !== checkDate || !xData) {
      updates["$set"]["lastLogin"] = checkDate;
      itr = 0;
      yData = [];
    }
    else
      itr = xData.length;
  }
  else {
    while(xData.length > 0 && xData[0] !== compX[0]) {
      xData.shift();
      yData.shift();
    }
    if(compX.slice(-1)[0] === `${end.getMonth() + 1}-${end.getDate()}-${end.getFullYear()}` && end.getHours() < 16)
      compX.pop();
    itr = xData.length;
  }
  //add data to yData accordingly
  if(itr === compX.length)
    return [updates, [xData, yData]]; //return if no new data needs to be added
  for(let j = itr; j < compX.length; j++)
    yData.push(account.buyingPower);
  const owned = account.owned;
  const ownedList = Object.keys(owned);
  for(const stock of ownedList) {
    //find indexOf(xData[itr]) for stock;
    const [stockX, stockY] = await getData(timeframe, goBack, stock);
    let stockItr = -1, tempI = itr;
    while(stockItr === -1) {
      stockItr = stockX.indexOf(compX[tempI]);
      if(--tempI < 0)
        break;
    }
    if(stockItr === -1)
      stockItr = 0;
    for(let j = itr; j < compX.length; j++) {
      yData[j] += stockY[stockItr] * owned[stock];
      while(stockItr < stockX.length - 1 && j < compX.length - 1 && timeLTE(stockX[stockItr + 1], compX[j + 1], chartType))
        stockItr++;
    }
  }
  const charts = account.charts;
  charts[chartType] = [compX, yData];
  updates["$set"]["charts"] = charts;
  if(chartType === "day")
    updates["$set"]["accountValue"] = Number(yData.slice(-1)[0].toFixed(2));

  return [updates, [compX, yData]];
}

const updateEachChart = async (account) => {
  let updates;
  const charts = account.charts;
  const params = [
    ["5Min", 0, "day"],
    ["1Hour", 7, "week"],
    ["1Day", 1, "month"],
    ["1Day", 3, "month3"],
    ["1Day", 6, "month6"],
    ["1Day", 12, "year"],
  ];
  for(const p of params) {
    const response = await getPortData(p[0], p[1], account);
    charts[p[2]] = response[1];
    if(p[2] === "day")
      updates = response[0];
  }
  updates["$set"]["charts"] = charts;
  return [updates, charts];
}

//used for persistent login
const issueAuthToken = async (account) => {
  const payload = {_id: account._id, userID: account.userID};
  const secret = process.env.JWT_SECRET;
  const options = {expiresIn: "1h"};

  const token = await jwt.sign(payload, secret, options);
  return token;
}

const issueAuthCookie = (res, token) => {
  const cookieOptions = {httpOnly: true, maxAge: 1000 * 60 * 60, sameSite: "strict", secure: true};
  res.cookie("authToken", token, cookieOptions);
}

exports.getData = getData;
exports.percentChange = percentChange;
exports.findOpen = findOpen;
exports.getPortData = getPortData;
exports.updateEachChart = updateEachChart;
exports.issueAuthToken = issueAuthToken;
exports.issueAuthCookie = issueAuthCookie;
exports.fetchOptions = fetchOptions;
