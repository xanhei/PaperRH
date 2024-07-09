import "../App.css";
import { useState, useEffect } from "react";
import { focusBtn } from "../auxFunctions/functions";

const Exchange = (props) => {
  const [ex, setEx] = useState("Buy");
  const [sd, setSD] = useState("Shares");
  const [placeholder, setPlaceholder] = useState("0");
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
          <select className="exchangeInput" onChange={(event) => setSD(event.target.selectedOptions[0].value)}>
            <option className="exchangeInput" value="Shares">Shares</option>
            <option className="exchangeInput" value="Dollars">Dollars</option>
          </select>
        </div>
        <div className="exchangeSection">
          <p>{sd}</p>
          <input className="exAmount" placeholder={placeholder}></input>
        </div>
        <div className="exchangeSection">
          <p>Market Price</p>
          <p className="exchangeNum"></p>
        </div>
        <div className="exchangeSection">
          <p>Estimated Cost</p>
          <p className="exchangeNum"></p>
        </div>
      </div>
      <hr className="line"></hr>
      <button className="submit">Review Order</button>
      <hr className="line"></hr>
      <button className="submit">Add to Watchlist</button>
    </>
  );
}

export default Exchange;
