import React from "react";

import "./App.css";
import Batch from "./components/batch";
import Web3 from "web3";
import { ethers } from "ethers";

const App = () => {
  // window.web3 = new Web3(window.web3.currentProvider);
  window.web3 = new Web3(window.ethereum);
  window.provider = new ethers.providers.Web3Provider(window.ethereum);
  return (
    <div className="App">
      <Batch />
    </div>
  );
};

export default App;
