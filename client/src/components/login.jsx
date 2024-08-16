import "../App.css"
import { useState, useEffect } from "react"

const phrases = [["Already have an account? ", "Sign In"], ["Don't have an account? ", "Register"]];

const LoginScreen = (props) => {
  const [phraseIndex, setPhraseIndex] = useState(1);
  const [alert, setAlert] = useState("");

  const loginCheck = async () => {
    const res = await props.login(document.querySelector("#u").value, document.querySelector("#p").value, phraseIndex === 0);
    if(!res !== "")
      setAlert(res);
  }
  return (
    <div className="loginPage">
      <h1>Paper RH (Demo Project)</h1>
      <div className="switchBtns">
        <p>{phrases[phraseIndex][0]}</p>
        <button className="switchLoginMethod" onClick={() => setPhraseIndex(prev => (prev + 1) % 2)}>{phrases[phraseIndex][1]}</button>
      </div>
      <p className="disclaimer">Username and password do not have to be complicated</p>
      <div className="userPass">
        {alert !== "" ? <p className="loginError">Error: {alert}</p> : <></>}
        <input id="u" className="userPassInput" placeholder="Username" autoComplete="off"></input>
        <input id="p" className="userPassInput" type="password" placeholder="Password"></input>
        <button style={{cursor: "pointer"}} onClick={() => loginCheck()}>{phrases[(phraseIndex + 1) % 2][1]}</button>
      </div>
    </div>
  );
}

export default LoginScreen;
