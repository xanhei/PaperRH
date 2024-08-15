import "../App.css";

const DropDown = (props) => {
  return (
    <div className="dropdown">
      {props.tickers.map((ticker, index) =>
        <div key={index} className="menuComponent" onClick={() => props.click(ticker)}>
          <p className="menuTicker">{ticker}</p>
          <p className="menuName">{props.names[index]}</p>
        </div>
      )}
    </div>
  )
}

export default DropDown;