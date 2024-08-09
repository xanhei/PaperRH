require('dotenv').config();

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
  let dateURL = new Date(
    Number(today.getFullYear()),
    (goBack != 7) ? Number(today.getMonth()) - goBack : Number(today.getMonth()),
    (goBack == 7 || goBack == 0) ? Number(today.getDate()) - 7 : Number(today.getDate()),
  );
  dateURL = dateURL.toISOString();
  dateURL = dateURL.substring(0, 10);
  if(goBack == 0)
    dateURL = await findOpen(dateURL, `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`);
  const response = await fetch(url + params + `&symbols=${term}` + `&timeframe=${timeframe}` + `&start=${dateURL}`, fetchOptions)
  const res = await response.json();

  //set chart data if response is ok
  if(res.bars[term]) {
    let xData = await new Promise((resolve) => {
      resolve(
        (timeframe === "1Day") ? res.bars[term].map((bar) => formatTime(bar.t, timeframe)) : ltdTimeFormat(res.bars[term], timeframe === "5Min")
      );
    });
    let yData = await new Promise((resolve) => {
      resolve(
        (timeframe === "1Day") ? res.bars[term].map((bar) => Number(bar.c)) : ltdPriceFormat(res.bars[term], timeframe === "5Min")
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
  const fetchDate = await findOpen(`${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`, `${end.getFullYear()}-${end.getMonth() + 1}-${end.getDate()}`, true);
  let params = `?sort=asc&symbols=${term}&timeframe=1Day&start=${fetchDate}&end=${fetchDate}`;
  const response = await fetch(`https://data.alpaca.markets/v2/stocks/bars${params}`, fetchOptions);
  const res = await response.json();
  return res;
}

/* aux functions used by getData() */

//function to find the most recent market open if current day is market holiday (for 1D)
const findOpen = async (startDate, endDate, percent = false) => {
  const url = "https://paper-api.alpaca.markets/v2/calendar";
  const response = await fetch(`${url}?start=${startDate}&end=${endDate}`, fetchOptions);
  const res = await response.json();
  const today = new Date();
  const wait = (today.toISOString().substring(0, 10) == res[res.length - 1].date && (today.getHours() < 9 || today.getHours() == 9 && today.getMinutes() < 30));
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
    date = date.toDateString();
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
      let i = (Number(s.substring(5, 7)) < 10) ? 6 : 5;
      let j = (Number(s.substring(8, 10)) < 10) ? 9 : 8;
      prefix = `${s.substring(i, 7)}-${s.substring(j, 10)}, `;
    }
    return `${prefix}${time} ${half}`;
  }
}

//formatting for bars that are less than a day (have to include close for last bar)
const ltdTimeFormat = (arr, isMinBar) => {
  let res = [];
  if(isMinBar) {
    //set i to make sure first bar for 1D is not the 8:00 PM bar for the last day
    let i = (arr[0].t.substring(11,13) == "00") ? 1 : 0;
    res.push(formatTime(arr[i++].t));
    for(; i < arr.length; i++) {
      if(arr[i].t.substring(0, 10) != arr[i - 1].t.substring(0, 10)) {
        arr.splice(i);
        break;
      }
      res.push(formatTime(arr[i].t));
    }

    //ensure correct formatting of time on last bar's close
    const minutes = (Number(arr[arr.length - 1].t.substring(14, 16)) + 5) % 60;
    const nextHour = (minutes == 0) ? 1 : 0;
    const hours = (Number(arr[arr.length - 1].t.substring(11, 13)) + nextHour) % 24;
    let tempString = `${(hours < 10) ? "0" + hours : hours}:${(minutes < 10) ? "0" + minutes : minutes}`
    let formatString = arr[arr.length - 1].t.substring(0, 11) + tempString + ":00Z";
    if(formatString.substring(11, 16) !== "00:05")
      res.push(formatTime(formatString));
  }
  else {
    for(let i = 0; i < arr.length; i++) {
      if(arr[i].t.substring(11, 16) == "00:00")
          continue;
      res.push(formatTime(arr[i].t, "1Hour"));
      if(arr[i].t.substring(11, 16) == "23:00") {
        let k = (Number(arr[i].t.substring(5, 7)) < 10) ? 6 : 5;
        let j = (Number(arr[i].t.substring(8, 10)) < 10) ? 9 : 8;
        let prefix = `${arr[i].t.substring(k, 7)}-${arr[i].t.substring(j, 10)},`;
        res.push(`${prefix} 8:00 PM`);
      }
    }
  }
  return res;
}

const ltdPriceFormat = (arr, isMinBar) => {
  let res = []
  if(isMinBar) {
    let i = (arr[0].t.substring(11, 13) == "00") ? 1 : 0;
    res.push(arr[i++].o);
    for(; i < arr.length; i++) {
      if(arr[i].t.substring(0, 10) != arr[i - 1].t.substring(0, 10)) {
        arr.splice(i);
        break;
      }
      res.push(Number(arr[i].o));
    }

    //always append the close of the last bar
    res.push(Number(arr[arr.length - 1].c));
  }
  else {
    for(let i = 0; i < arr.length; i++) {
      if(arr[i].t.substring(11, 16) == "00:00")
          continue;
      res.push(Number(arr[i].o));
      if(arr[i].t.substring(11, 16) == "23:00")
        res.push(Number(arr[i].c));
    }
  }
  return res;
}

exports.getData = getData;
exports.percentChange = percentChange;
exports.findOpen = findOpen;
exports.fetchOptions = fetchOptions;
