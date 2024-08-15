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
  let percent = percentFormat(base, curr);
  percent = percent.substring(percent.length - 4); //resolve error where price change is negative, but rounded percent change is 0.00
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

//run getPortData for each chartType on login
/*export const loginUpdate = (account) => {
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
}*/

//
export const formatDailyChart = (xData) => {
  const now = new Date();
  if(now.getHours() < 4 || now.getHours() >= 20)
    return xData;
  const start = xData.slice(-1)[0];
  const pivot = start.indexOf(':');
  let count = 0;
  let hour = Number(start.substring(0, pivot)), minute = start.substring(pivot + 1, pivot + 3), half = start.substring(start.length - 2);
  while(`${hour}:${minute} ${half}` !== "8:00 PM" && count++ < 193) {
    minute = Number(minute) + 5;
    if(minute % 60 === 0) {
      minute = 0;
      hour += 1;
      if(hour % 13 === 0) {
        hour = 1;
        half = "PM";
      }
    }
    if(minute < 10)
      minute = "0" + minute;
    xData.push(`${hour}:${minute} ${half}`);
  }
  return xData;
}
