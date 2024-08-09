import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js/auto";

//color/bold effect when time button is clicked
export const focusBtn = async (id, bold) => {
  let arr = document.querySelectorAll(id);
  for(let i = 0; i < arr.length; i++) {
    if(arr[i] == document.activeElement) {
      arr[i].style.color = "rgb(3, 98, 252)";
      if(bold)
        arr[i].style.fontWeight = "bold";
    }
    else {
      arr[i].style.color = "";
      arr[i].style.fontWeight = "";
    }
  }
}

//ONLY USED FOR DISPLAY (on prices >= $1000), not used for actually storing price data
export const commaFormat = (num) => {
  num = (Math.ceil(num * 100) / 100).toFixed(2);
  const whole = num.toString();
  const integer = whole.substring(0, whole.length - 3);
  let res = "";
  for(let i = 0; i < integer.length; i++) {
    res += integer[i];
    if((integer.length - i - 1) % 3 == 0 && i + 1 != integer.length)
      res += ",";
  }
  res += whole.substring(whole.length - 3, whole.length);
  return res;
}

//display percent change of a stock's value in given time frame
export const percentFormat = (base, curr) => {
  let res = ((curr - base) / base * 100).toFixed(2);
  if(res >= 0)
    res = "+" + res;
  return res;
}

//
export const chartSubHeader = (base, curr) => {
  curr = curr.replaceAll(',', '');
  curr = Number(curr);
  let price = (curr - base).toFixed(2);
  const percent = percentFormat(base, curr);
  if(document.querySelector(".chartSubHead"))
    document.querySelector(".chartSubHead").style.color = price >= 0 ? "rgb(31, 217, 22)" : "rgb(242, 80, 5)";
  return `${price >= 0 ? `+$${commaFormat(price)}` : `-$${(-price).toFixed(2)}`} (${commaFormat(percent)}%)`;
}

//remove subscription from stock that are no longer being watched
export const unSubCheck = (arr, term, ws) => {
  if(!arr.includes(term))
    ws.send(JSON.stringify({action: "u", stocks: [term]}));
}

//review buy/sell request to ensure correct conditions are met
export const review = (amount, mult, buy, dollars, bp, stake) => {
  if(buy) {
    if(amount > 0) {
      if(amount * mult <= bp) {
        return true; //return [dollarvalue, shares]
      }
      else {
        alert(`Not enough cash to buy`);
        return false; //return 0;
      }
    }
  }
  else {
    if(amount <= stake)
      return true; //return [dollarvalue, shares]
    else {
      alert("Not enough owned to sell");
      return false; //return 0;
    }
  }
}

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
    console.log(aHour);
    if(aHour === bHour) {
      return aMin <= bMin;
    }
    return aHour < bHour;
  }
  else if(type === "week") {
    const aPivot = a.indexOf('-'), bPivot = b.indexOf('-'); //used to find months/days
    const aSpace = a.indexOf(' ') + 1, bSpace = b.indexOf(' ') + 1; //used to find beginning of hours
    const aMonth = Number(a.substring(0, aPivot)), bMonth = Number(b.substring(0, bPivot));
    const aDay = Number(a.substring(aPivot + 1, a.indexOf(',')) - aPivot + 1), bDay = Number(b.substring(bPivot + 1, b.indexOf(',') - bPivot + 1));
    let aHour = Number(a.substring(aSpace, a.indexOf(':') - aSpace)), bHour = Number(b.substring(bSpace, b.indexOf(':') - bSpace));
    if(aHour !== 12 && a.substring(a.length - 2) === "PM")
      aHour += 12;
    if(bHour !== 12 && bHour.substring(b.length - 2) === "PM")
      bHour += 12;
    //<-- calc hours
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
    const [aMonth, aDay, aYear] = [a.substring(0, aPivot), a.substring(aPivot + 1, a.length - 5 - aPivot), a.substring(a.length - 4)];
    const [bMonth, bDay, bYear] = [b.substring(0, bPivot), b.substring(bPivot + 1, b.length - 5 - bPivot), b.substring(b.length - 4)];
    if(aYear === bYear) {
      if(aMonth === bMonth)
        return aDay <= bDay;
      return aMonth < bMonth;
    }
    return aYear < bYear;
  }
}

//portfolio version of getData()
export const getPortData = async (timeframe, goBack, account) => {
  const options = {method: "PUT", header: {"content-type": "application/json"}};
  let itr;
  //select chartType and data from chart
  const select = {0: "day", 7: "week", 1: "month", 3: "month3", 6: "month6", 12: "year"};
  const chartType = select[goBack];
  let [xData, yData] = account.charts[chartType];
  //fetch dummy time array
  const compTime = await fetch(`${process.env.REACT_APP_EXPRESS_URL}stocks?stock=NVDA&period=${timeframe}&goBack=${goBack}`);
  const [compX, compY] = await compTime.json();
  if(chartType === "day") {
    //get db data and compare times with most recent times
    const checkDate = await fetch(`${process.env.REACT_APP_EXPRESS_URL}prevOpen`);
    const check = await checkDate.json();
    //if last time data was updated was >1Day, clear current db data, else concat data where necessary
    if(account.lastLogin !== check.date) {
      fetch(`${process.env.REACT_APP_EXPRESS_URL}updateLogin?user=test&date=${check.date}`, options);
      itr = 0;
      yData = [];
    }
    else
      itr = xData.length;
  }
  else {
    //<-- set up temp date format for comparison
    let itr = 0;
    while(itr < xData.length && xData[itr] !== compX[0])
      yData.shift();
    itr = compX.length - itr;
  }
  //add data to yData accordingly
  if(itr === compX.length)
    return [xData, yData]; //return if no new data needs to be added
  for(let j = itr; j < compX.length; j++)
    yData.push(account.buyingPower);
  const owned = account.owned;
  const ownedList = Object.keys(owned);
  for(const stock of ownedList) {
    //find indexOf(xData[itr]) for stock;
    const stockRes = await fetch(`${process.env.REACT_APP_EXPRESS_URL}stocks?stock=${stock}&period=${timeframe}&goBack=${goBack}`);
    const [stockX, stockY] = await stockRes.json();
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
  fetch(`${process.env.REACT_APP_EXPRESS_URL}updatePortChart?user=test&chart=${chartType}&xData=${JSON.stringify(compX)}&yData=${JSON.stringify(yData)}`, options);
  return [compX, yData];
}

//run getPortData for each chartType on login
export const loginUpdate = (account) => {
  const params = [
    ["5Min", 0],
    ["1Hour", 7],
    ["1Day", 1],
    ["1Day", 3],
    ["1Day", 6],
    ["1Day", 12],
  ];
  for(const arr of params)
    getPortData(arr[0], arr[1], account);
}
