import React from "react";

const withChainId = (WrappedComponent) => {
  class WithChainId extends React.Component {
    state = { chainId: null };

    async componentDidMount() {
      window.ethereum && window.ethereum.on && window.ethereum.on("chainChanged", this.handleChainChanged);
      window.ethereum.autoRefreshOnNetworkChange = false;
      await this.handleChainChanged();
    }

    componentWillUnmount() {
      window.ethereum && window.ethereum.removeListener && window.ethereum.removeListener("chainChanged", this.handleChainChanged);
    }

    handleChainChanged = async (_chainId) => {
      const chainId = parseInt(_chainId || (await window.ethereum.request({ method: "eth_chainId" })));
      if (this.state.chainId !== chainId) {
        if (this.state.chainId && this.state.chainId !== chainId) window.location.reload(); // refresh page
        this.setState({ chainId });
      }
    };

    render() {
      return <WrappedComponent chainId={this.state.chainId} {...this.props} />;
    }
  }
  return WithChainId;
};

export default withChainId;
