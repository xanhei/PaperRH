import "../App.css";
import { useState, useEffect } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { focusBtn, commaFormat } from "../auxFunctions/functions";

const editPhrase = ["Add to", "Remove from"];

const Exchange = (props) => {
  const [ex, setEx] = useState("Buy"); //determines whether exchange will be Buy or Sell
  const [sd, setSD] = useState("Shares"); //determines whether user is buying/selling in shares or dollars
  const [placeholder, setPlaceholder] = useState(0); //placeholder amount to be bought/sold
  const [editIndex, setEditIndex] = useState(props.contains ? 1 : 0); //used for changing watchlist (see line 5)
  const [inputVal, setInputVal] = useState(0);

  useEffect(() => setEditIndex(props.contains ? 1 : 0), [props.contains]); //ensures editPhrase is correct when new stock is searched from individual stock view
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
          <p className="exchangeNum">${props.marketPrice}</p>
        </div>
        <div className="exchangeSection">
          <p>Estimated Cost</p>
          <p className="exchangeNum">${commaFormat(sd == "Shares" ? (props.marketPrice * inputVal) : inputVal)}</p>
        </div>
        <p className="disclaimer">**Price may differ when order is submitted**</p>
      </div>
      <hr className="line"></hr>
      <button className="submit">Review Order</button>
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
