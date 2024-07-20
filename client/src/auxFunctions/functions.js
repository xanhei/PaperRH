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
  curr = Number(curr);
  let price = (curr - base).toFixed(2);
  const percent = percentFormat(base, curr);
  if(document.querySelector(".chartSubHead"))
    document.querySelector(".chartSubHead").style.color = price >= 0 ? "rgb(31, 217, 22)" : "rgb(242, 80, 5)";
  return `${price >= 0 ? `+$${price}` : `-$${(-price).toFixed(2)}`} (${percent}%)`;
}

//remove subscription from stock that are no longer being watched
export const unSubCheck = (arr, term, ws) => {
  if(!arr.includes(term))
    ws.send(JSON.stringify({action: "u", stocks: [term]}));
}
