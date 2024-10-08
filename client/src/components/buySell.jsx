import "../App.css";
import { useState, useEffect } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { focusBtn, commaFormat, review } from "../auxFunctions/functions";

const editPhrase = ["Add to", "Remove from"];

const Exchange = (props) => {
  const [ex, setEx] = useState("Buy"); //determines whether exchange will be Buy or Sell
  const [sd, setSD] = useState("Shares"); //determines whether user is buying/selling in shares or dollars
  const [placeholder, setPlaceholder] = useState(0); //placeholder amount to be bought/sold
  const [editIndex, setEditIndex] = useState(props.contains ? 1 : 0); //used for changing watchlist (see line 5)
  const [inputVal, setInputVal] = useState(0);
  const [mktPrice, setMktPrice] = useState("Loading...");
  const [quotesArr, setQuotesArr] = useState([]);
  //const [openQuery, setOpenQuery] = useState({});

  //ensures new stats do not rollover when searching for a new stock from individual stock view
  const resetStats = () => {
    console.log(props.marketPrice.replaceAll(',', ''));
    setEditIndex(props.contains ? 1 : 0)
    setMktPrice("Loading...");
    setQuotesArr([]);
  }
  
  const findPrice = async () => {
    const response = await fetch(`${process.env.REACT_APP_EXPRESS_URL}quotes?stock=${props.stock}`);
    const res = await response.json();
    if(res.stock === document.querySelector(".portChart").getAttribute("stock")) {
      setQuotesArr(res.arr);
      if(res.arr[0] === -1)
        setMktPrice("Unavailable");
      else
        setMktPrice("$" + commaFormat(res.arr[Math.floor(res.arr.length / 2)]));
    }
    return {stock: res.stock, price: res.arr[Math.floor(res.arr.length / 2)]};
  }

  useEffect(() => {resetStats(); findPrice()}, [props.stock]);
  return (
    <>
      <div className="buySell">
        <button className="exchangeBtn" autoFocus onFocus={() => {focusBtn(".exchangeBtn", false); setEx("Buy");}}>Buy</button>
        <button className="exchangeBtn" onFocus={() => {focusBtn(".exchangeBtn", false); setEx("Sell")}}>Sell</button>
      </div>
      <hr className="line"></hr>
      <div className="orderNums">
        <div className="exchangeSection">
          <p>{ex} In</p>
          <select className="exchangeInput" onChange={(event) => {
            const val = event.target.selectedOptions[0].value;
            setSD(val);
            setPlaceholder(val == "Shares" ? 0 : "$0.00");
            event.target.parentElement.nextSibling.firstChild.nextSibling.value = "";
            setInputVal(0);
          }}>
            <option className="exchangeInput" value="Shares">Shares</option>
            <option className="exchangeInput" value="Dollars">Dollars</option>
          </select>
        </div>
        <div className="exchangeSection">
          <p>{sd}</p>
          <input className="exAmount" placeholder={placeholder} type="number" min={0} onChange={() => {
            setInputVal(document.querySelector(".exAmount").value);
          }}></input>
        </div>
        <div className="exchangeSection">
          <p>Market Price</p>
          <p className="exchangeNum">{mktPrice}</p>
        </div>
        <div className="exchangeSection">
          <p>Estimated Cost</p>
          <p className="exchangeNum">${
            commaFormat(sd === "Shares" ? ((quotesArr.length > 0 && quotesArr[0] !== -1 ?
            quotesArr[Math.floor(quotesArr.length / 2)] : props.marketPrice.replaceAll(',', '')) * inputVal) : inputVal)
          }</p>
        </div>
        <p className="disclaimer">**Price may differ when order is submitted**</p>
      </div>
      <hr className="line"></hr>
      <button className="submit" onClick={async () => {
        let amount = Number(document.querySelector(".exAmount").value);
        const dollars = sd === "Dollars";
        const type = ex === "Buy";
        const buyPower = props.bp;
        const numOwned = props.stake;
        const stock = props.stock;
        let mult;
        while(!mult) {
          const temp = await findPrice();
          if(temp.stock !== props.stock)
            continue;
          if(temp.price > 0)
            mult = temp.price;
          else {
            alert("Unable to place order right now");
            return;
          }
        }
        amount /= (sd === "Dollars" ? mult : 1);
        if(review(amount, mult, type, dollars, buyPower, numOwned))
          props.action(amount, mult, type, stock);
      }}>Review Order</button>
      <div className="exchangeSection">
        <p>Buying Power</p>
        <p className="exchangeNum">${commaFormat(props.bp)}</p>
      </div>
      <hr className="line"></hr>
      <button className="submit" onClick={() => {
        const changed = props.wlChange(); //true if stock was added/removed, false otherwise (user already subscribed to max number of stocks)
        if(changed)
          setEditIndex(prev => (prev + 1) % 2);
      }}>{editPhrase[editIndex]} Watchlist</button>
    </>
  );
}

export default Exchange;
