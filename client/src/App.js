import React from "react";

import "./App.css";
import Batch from "./components/batch";
import Web3 from "web3";

const App = () => {
  window.web3 = new Web3(window.ethereum);
  return (
    <div className="App">
      <Batch />
    </div>
  );
};

export default App;
