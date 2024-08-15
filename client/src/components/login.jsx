import "../App.css"
import { useState, useEffect } from "react"

const LoginScreen = () => {
  console.log(props);
  return (
    <div className="loginPage">
      <div className="switchBtns">
        <button>Register</button>
        <button>Sign in</button>
      </div>
      <div className="userPass">
        <input placeholder="Username"></input>
        <input placeholder="Password"></input>
        <button>Submit</button>
      </div>
    </div>
  );
}

export default LoginScreen;
