import React, { Component } from "react";
import { Row, Col, Collapse, Button, Typography, Space } from "antd";

import { PlusOutlined } from "@ant-design/icons";
import Batcher from "../build/contracts/Batcher.json";
import Call from "./call";
import "./batch.scss";

const { Panel } = Collapse;
const { Text } = Typography;

class Batch extends Component {
  state = {
    calls: [{}],
    activeKeys: [0],
    numVars: 0,
  };

  handleSubmit = async () => {
    const numVars = this.getNumVarsAvailableForCall(this.state.calls.length);

    const payload = this.state.calls
      .filter((c) => c.address && c.abi && c.functionId)
      .map(({ abi, functionId, inputs, address, outputVarIds, valueInput }, index) => {
        const fun = abi && abi.filter((e) => e.type === "function")[functionId];
        if (inputs.some((input) => !input)) throw new Error(`Call ${index} has a missing input`);
        const placeholders = inputs.map((_, idx) => window.web3.utils.sha3(`batcher.call${index}.input${idx}`));
        const paramsWithPlaceholders = inputs.map((input, inputIndex) => (input.type === "value" ? input.value : placeholders[inputIndex]));

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
        const params = inputs.map((input) => (input.type === "value" ? input.value : 0));
        const data = window.web3.eth.abi.encodeFunctionCall(funAfterTypeToUintSubstitution, params);

        return {
          to: address,
          data,
          value,
          outVarIndex: outputVarIds[0] || 0, // only first output is used for now!!
          varPositions,
        };
      });

    const batcher = new window.web3.eth.Contract(Batcher.abi, "0x9889BB16497B9C07139871aea42E1c819a9f7e88");
    const accounts = await window.web3.eth.requestAccounts();
    const txR = await batcher.methods.execute(payload, numVars).send({ from: accounts[0] });

    console.log({ txR });
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
    const calls = [...this.state.calls];
    calls[index] = { ...calls[index], ...call };
    this.setState({ calls });
  };

  handleAddClick = () => {
    const calls = [...this.state.calls];
    const activeKeys = [...this.state.activeKeys];
    activeKeys.push(calls.length);
    calls.push({});
    this.setState({ calls, activeKeys });
  };

  renderCallHeader = (id, call) => {
    const { contractName, abi, functionId, inputs } = call;
    const fun = abi && abi.filter((e) => e.type === "function")[functionId];
    const formattedValue = (value, inputIndex) => {
      if (!fun) return value;
      const { type } = fun.inputs[inputIndex];
      if (type === "address") {
        const targetContract = this.state.calls.find((c) => c.address === value);
        return (targetContract && targetContract.contractName) || (value && `${value.slice(0, 5)}…${value.slice(40, 42)}`);
      }
      return value;
    };
    const funName = (fun && `.${fun.name}`) || "";
    const params =
      (inputs &&
        `(${inputs
          .filter((i) => i)
          .map(({ type, value }, idx) => (type === "value" ? formattedValue(value, idx) : `Var${value}`))
          .join(", ")})`) ||
      "";
    return `${id}${contractName ? ` - ${contractName}${funName}${params}` : ""}`;
  };

  render() {
    return (
      <Row>
        <Col span={12} offset={6}>
          <div style={{ textAlign: "right" }}>
            <Space size="small">
              <Button key="3">Load</Button>
              <Button key="2">Save</Button>
              <Button key="1" type="primary" onClick={this.handleSubmit}>
                Submit
              </Button>
            </Space>
          </div>
          <br />
          <Collapse
            defaultActiveKey={[]}
            activeKey={this.state.activeKeys}
            onChange={(activeKeys) => {
              this.setState({ activeKeys: activeKeys.map((k) => parseInt(k)) });
            }}
          >
            {this.state.calls.map((call, callId) => (
              <Panel header={this.renderCallHeader(callId, call)} key={callId} extra={null}>
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

export default Batch;
