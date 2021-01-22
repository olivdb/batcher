import React from "react";

import "./App.css";
import Batch from "./components/batch";
import Web3 from "web3";
import { ethers } from "ethers";
import withChainId from "./components/withChainId";

const SUPPORTED_NETWORKS = { Rinkeby: 4, Ropsten: 3, Kovan: 42 };

const App = ({ chainId }) => {
  const renderChangeNetwork = () => {
    const networks = Object.keys(SUPPORTED_NETWORKS);
    return (
      <>
        <br />
        <br />
        <center>Please change your network to {networks.length === 1 ? networks[0] : `one of ${networks.join(", ")}`} </center>
      </>
    );
  };

  // window.web3 = new Web3(window.web3.currentProvider);
  window.web3 = new Web3(window.ethereum);
  window.provider = new ethers.providers.Web3Provider(window.ethereum);

  const unsupportedNetwork = chainId && !Object.values(SUPPORTED_NETWORKS).includes(chainId) && chainId !== 1337;
  if (unsupportedNetwork) return renderChangeNetwork();

  return (
    <div className="App">
      <Batch chainId={chainId} />
    </div>
  );
};

export default withChainId(App);
