import React, { Component } from "react";
import { Card, Row, Col, Collapse, Button, Space, Input } from "antd";

import { PlusOutlined, UnorderedListOutlined, CopyOutlined, CloseOutlined, ImportOutlined, ExportOutlined } from "@ant-design/icons";
// import { ethers } from "ethers";

import Batcher from "../build/contracts/Batcher.json";
import withBatcher from "./withBatcher";
import withChainId from "./withChainId";
import Call from "./call";
import "./batch.scss";

const { Panel } = Collapse;

const MAX_UINT = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

class Batch extends Component {
  state = {
    calls: [{}],
    activeKeys: [0],
    numVars: 0,
    value: null,
  };

  handleSubmit = async () => {
    if (!this.props.batcherAddress) throw new Error("No Batcher found for account");
    const numVars = this.getNumVarsAvailableForCall(this.state.calls.length);

    const payload = this.state.calls
      .filter((c) => c.address && c.abi && c.functionId)
      .map(({ abi, functionId, inputs, address, outputVarIds, valueInput }, index) => {
        const fun = abi && abi.filter((e) => e.type === "function")[functionId];
        if (inputs.some((input) => !input)) throw new Error(`Call ${index} has a missing input`);
        const placeholders = inputs.map((_, idx) => window.web3.utils.sha3(`batcher.call${index}.input${idx}`));
        const normalizedValue = (value) => (value === "-1" ? MAX_UINT : value);
        const paramsWithPlaceholders = inputs.map((input, inputIndex) =>
          input.type === "value" ? normalizedValue(input.value) : placeholders[inputIndex]
        );

        const funAfterTypeToUintSubstitution = {
          ...fun,
          inputs: fun.inputs.map((input, idx) => (inputs[idx].type === "variable" && { ...input, type: "uint256" }) || input),
        };

        const dataWithPlaceholders = window.web3.eth.abi.encodeFunctionCall(funAfterTypeToUintSubstitution, paramsWithPlaceholders);
        const varPositions = [...Array(numVars + 1).keys()].slice(1).map((varId) => {
          const inputIndex = inputs.findIndex((input) => input.type === "variable" && input.value === varId);
          return (inputIndex > -1 && dataWithPlaceholders.slice(2).indexOf(placeholders[inputIndex].slice(2)) / 2) || 0;
        });

        const value = (valueInput && valueInput.type === "value" && valueInput.value) || 0;
        const params = inputs.map((input) => (input.type === "value" ? normalizedValue(input.value) : 0));
        const data = window.web3.eth.abi.encodeFunctionCall(funAfterTypeToUintSubstitution, params);

        return {
          to: address,
          data,
          value,
          outVarIndex: outputVarIds[0] || 0, // only first output is used for now!!
          varPositions,
        };
      });

    const batcher = new window.web3.eth.Contract(Batcher.abi, this.props.batcherAddress);
    const accounts = await window.web3.eth.requestAccounts();
    /*const txR =*/ await batcher.methods.execute(payload, numVars).send({ from: accounts[0], value: this.state.value });

    // const batcher = new ethers.Contract(this.props.batcherAddress, Batcher.abi, window.provider).connect(window.provider.getSigner());
    // const txR = await (await batcher.execute(payload, numVars, { value: this.state.value })).wait();
  };

  getNumVarsAvailableForCall = (callId) => {
    let numVars = 0;
    for (let i = 0; i < callId; i++) {
      const { outputVarIds } = this.state.calls[i];
      numVars = Math.max(numVars, Math.max(...(outputVarIds || [])));
    }
    return numVars;
  };

  handleCallChanged = (index, call) => {
    // const numVarsBeforeCall = this.getNumVarsAvailableForCall(index)
    // const prevNumVarsWithCall = this.getNumVarsAvailableForCall(index+1)
    // const numVarsWithCall = Math.max(numVarsBeforeCall, call.outputVarIds)
    // if(prevNumVarsWithCall < numVarsWithCall) {

    // }

    const calls = [...this.state.calls];
    calls[index] = { ...calls[index], ...call };
    this.setState({ calls });
  };

  handleValueChanged = (value) => {
    this.setState({ value });
  };

  handleAddClick = () => {
    const calls = [...this.state.calls];
    const activeKeys = [...this.state.activeKeys];
    activeKeys.push(calls.length);
    calls.push({});
    this.setState({ calls, activeKeys });
  };

  handleCollapseClick = () => {
    const allKeys = Object.keys(this.state.calls);
    const activeKeys = this.state.activeKeys.length === 0 ? allKeys : [];
    this.setState({ activeKeys });
  };

  handleCreateProxy = async () => {
    await this.props.createBatcher();
  };

  handleLoad = async () => {
    const { batcherAddress } = this.props;
    // try {
    let json = await navigator.clipboard.readText();

    if (json.includes("__MY_BATCHER__")) {
      if (!batcherAddress) return;
      json = json.replace(/__MY_BATCHER__/g, batcherAddress);
      console.log("rep", batcherAddress);
    }
    const state = JSON.parse(json);
    state.activeKeys = [];
    this.setState(state);
    console.log({ state });
    // } catch (err) {
    //   console.warn("Error importing scipt:", err);
    // }
  };

  handleSave = async () => {
    const { batcherAddress } = this.props;
    let json = JSON.stringify(this.state);
    if (batcherAddress) {
      json = json.replace(new RegExp(batcherAddress, "g"), "__MY_BATCHER__");
    }
    await navigator.clipboard.writeText(json);
  };

  handleCallRemoval = (callId) => {
    const calls = [...this.state.calls];
    calls.splice(callId, 1);
    this.setState({ calls });
  };

  renderCallHeader = (id, call) => {
    const { contractName, abi, functionId, inputs, outputVarIds } = call;
    const fun = abi && abi.filter((e) => e.type === "function")[functionId];
    const formattedValue = (value, inputIndex) => {
      if (!fun) return value;
      const { type } = fun.inputs[inputIndex];
      const formatAddress = (addr) => {
        if (!addr) return "0x";
        const targetContract = this.state.calls.find((c) => c.address === addr);
        return (
          (targetContract && targetContract.contractName) ||
          (addr === this.props.batcherAddress && "Proxy") ||
          (addr && `${addr.slice(0, 5)}…${addr.slice(40, 42)}`)
        );
      };
      const formatInteger = (val) => (parseInt(val) >= 10000 ? parseInt(val).toExponential(2) : val);

      const formatScalar = (val, type) => {
        if (type === "address") {
          return formatAddress(val);
        } else if (type === "uint256") {
          return formatInteger(val);
        }
        return val || 0;
      };

      if (type.endsWith("[]")) {
        return `[${(value || []).map((v) => formatScalar(v, type.slice(0, -2))).join(", ")}]`;
      }
      return formatScalar(value, type);
    };
    const funName = (fun && `.${fun.name}`) || "";
    const params =
      (inputs &&
        `(${inputs
          .map((inp, idx) => (inp && inp.type === "variable" && `Var${inp.value}`) || formattedValue((inp && inp.value) || null, idx))
          .join(", ")})`) ||
      "";
    const write = (outputVarIds && (outputVarIds[0] || 0) > 0 && ` ⟶ Var${outputVarIds[0]}`) || "";
    return `${id + 1}${contractName ? ` - ${contractName}${funName}${params}${write}` : ""}`;
  };

  renderProxyLabel() {
    const { batcherAddress, batcherLoading } = this.props;
    return (
      ((batcherAddress || batcherLoading) && (
        <Card bordered={true} className="proxy-card">
          <Space>
            <span className="label">Proxy: </span>
            {(batcherAddress && (
              <>
                <span className="address">{`${batcherAddress.slice(0, 6)}…${batcherAddress.slice(38, 42)}`}</span>
                <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => navigator.clipboard.writeText(batcherAddress)} />
              </>
            )) || <span>Loading...</span>}
          </Space>
        </Card>
      )) || <Button onClick={this.handleCreateProxy}>Create Proxy</Button>
    );
  }

  render() {
    return (
      <Row>
        <Col span={14} offset={5}>
          <Row style={{ paddingBottom: 15 }}>
            <Col span={12}>
              <div style={{ textAlign: "left" }}>
                <Space size="small">
                  <Button icon={<UnorderedListOutlined />} onClick={this.handleCollapseClick} />
                  {this.renderProxyLabel()}
                </Space>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ textAlign: "right" }}>
                <Space size="small">
                  <Button style={{ paddingLeft: 8, paddingRight: 8 }} onClick={this.handleLoad} icon={<ImportOutlined />}>
                    Import
                  </Button>
                  <Button style={{ paddingLeft: 8, paddingRight: 8 }} onClick={this.handleSave} icon={<ExportOutlined />}>
                    Export
                  </Button>
                  <Input name="value" placeholder="value (wei)" value={this.state.value} onChange={(e) => this.handleValueChanged(e.target.value)} />
                  <Button type="primary" onClick={this.handleSubmit}>
                    Submit
                  </Button>
                </Space>
              </div>
            </Col>
          </Row>

          <Collapse
            defaultActiveKey={[]}
            activeKey={this.state.activeKeys}
            onChange={(activeKeys) => {
              this.setState({ activeKeys: activeKeys.map((k) => parseInt(k)) });
            }}
          >
            {this.state.calls.map((call, callId) => (
              <Panel
                header={this.renderCallHeader(callId, call)}
                key={callId}
                extra={
                  this.state.activeKeys.includes(callId) ? (
                    <Button shape="circle" size="small" danger icon={<CloseOutlined />} onClick={() => this.handleCallRemoval(callId)} />
                  ) : null
                }
              >
                <Call {...call} numVars={this.getNumVarsAvailableForCall(callId)} onCallChanged={(call) => this.handleCallChanged(callId, call)} />
              </Panel>
            ))}
          </Collapse>
          <div style={{ textAlign: "right" }}>
            <br />
            <Button type="default" shape="circle" icon={<PlusOutlined onClick={this.handleAddClick} />}></Button>
          </div>
        </Col>
      </Row>
    );
  }
}

export default withBatcher(Batch);
