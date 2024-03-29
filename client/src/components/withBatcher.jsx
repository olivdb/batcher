import React from "react";
import { ethers } from "ethers";
import BatcherFactory from "../build/contracts/BatcherFactory.json";
import Batcher from "../build/contracts/Batcher.json";

const withBatcher = (WrappedComponent) => {
  class WithBatcher extends React.Component {
    state = { batcherAddress: null, batcherLoading: true };

    setState(state, callback) {
      this._isMounted && super.setState(state, callback);
    }

    async componentDidMount() {
      this._isMounted = true;
      window.ethereum.on("accountsChanged", this.updateBatcher);
      await this.updateBatcher();
    }

    async componentDidUpdate(prevProps, prevState) {
      const { chainId } = this.props;
      if (chainId !== prevProps.chainId) {
        await this.updateBatcher();
      }
    }

    componentWillUnmount() {
      window.ethereum && window.ethereum.removeListener && window.ethereum.removeListener("accountsChanged", this.updateBatcher);
      this._isMounted = false;
    }

    getFactory = () => {
      if (!this.props.chainId) return null;
      const { abi, networks } = BatcherFactory;
      const { address } = networks[this.props.chainId.toString()];
      const factory = new window.web3.eth.Contract(abi, address);
      return factory;
    };

    updateBatcher = async () => {
      const factory = this.getFactory();
      if (!factory) return;
      this.setState({ batcherLoading: true });
      const accounts = await window.web3.eth.requestAccounts();
      const creates = await factory.getPastEvents("Created", {
        filter: { owner: accounts[0] },
        fromBlock: 0,
      });

      let batcherAddress = null;
      for (let i = creates.length - 1; i >= 0; i--) {
        const address = creates[i].returnValues.batcher;
        const batcher = new window.web3.eth.Contract(Batcher.abi, address);
        const owner = await batcher.methods.owner().call();
        if (owner === accounts[0]) {
          batcherAddress = address;
          break;
        }
      }
      this.setState({ batcherAddress, batcherLoading: false });
    };

    createBatcher = async () => {
      this.setState({ batcherLoading: true });
      const accounts = await window.web3.eth.requestAccounts();
      if (!this.props.chainId) return;

      //   const factory = this.getFactory();
      //   const txR = await factory.methods.build(accounts[0]).send({ from: accounts[0] });
      //   const batcherAddress = txR.receipt.logs[0].args.batcher;

      // temporay using etherjs instead of web3js here until txReceipt issue is solved in web3js
      const { abi, networks } = BatcherFactory;
      const { address } = networks[this.props.chainId.toString()];
      const factory = new ethers.Contract(address, abi, window.provider).connect(window.provider.getSigner());
      let batcherAddress = null;
      try {
        const txR = await (await factory["build(address)"](accounts[0])).wait();
        batcherAddress = `0x${txR.logs[2].data.slice(26)}`;
      } finally {
        this.setState({ batcherAddress, batcherLoading: false });
      }
    };

    render() {
      return <WrappedComponent {...this.state} createBatcher={this.createBatcher} {...this.props} />;
    }
  }
  return WithBatcher;
};

export default withBatcher;
