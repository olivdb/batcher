import React, { Component, Fragment } from "react";
import { Row, Col, Button, Input, Select, Form, Divider } from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import axios from "axios";

import "./call.scss";

const { Option } = Select;
const API = "https://api-rinkeby.etherscan.io/api";
const API_KEY = "VNAK514K6ENK93TA8TEKHT7FZF8G72RWR6";

class Call extends Component {
  state = { addressValidationStatus: null, addressError: null, newAddress: null, addressFocus: false };

  handleContractAddressFocus = (addressFocus) => {
    let newState = { addressFocus };
    if (!addressFocus) {
      newState = { ...newState, newAddress: null, addressValidationStatus: null, addressError: null };
    }
    this.setState(newState);
  };

  handleContractChanged = async (newAddress) => {
    const { onCallChanged, address } = this.props;
    this.setState({ newAddress });
    if (!newAddress) {
      this.setState({ addressValidationStatus: null, addressError: null });
    } else if (newAddress === address) {
      this.setState({ addressValidationStatus: "success", addressError: null });
    } else if (newAddress !== address && window.web3.utils.isAddress(newAddress.toLowerCase())) {
      this.setState({ addressValidationStatus: "validating", addressError: null });
      let data = (await axios.get(API, { params: { module: "contract", action: "getabi", address: newAddress, apiKey: API_KEY } })).data;
      if (data.status === "0") {
        onCallChanged({ abi: null, address: null, contractName: null, functionId: null, inputs: null, outputVarIds: null, valueInput: null });
        this.setState({ addressValidationStatus: "error", addressError: data.result });
      } else {
        const abi = JSON.parse(data.result);
        data = (await axios.get(API, { params: { module: "contract", action: "getsourcecode", address: newAddress, apiKey: API_KEY } })).data;
        const contractName = (data.status === "1" && data.result[0].ContractName) || null;
        onCallChanged({ abi, address: newAddress, contractName, functionId: null, inputs: null, outputVarIds: null, valueInput: null });
        this.setState({ addressValidationStatus: "success", addressError: null });
      }
    } else {
      this.setState({ addressValidationStatus: "error", addressError: "Malformed address" });
    }
  };

  handleFunctionChanged = (functionId) => {
    const { abi, onCallChanged } = this.props;
    const fun = abi && abi.filter((e) => e.type === "function")[functionId];
    const inputs = Array(fun.inputs.length).fill(null);
    const outputVarIds = Array(fun.outputs.length).fill(null);
    onCallChanged({ functionId, inputs, outputVarIds });
  };

  handleInputValueChanged = (index, value) => {
    const inputs = [...this.props.inputs];
    inputs[index] = { type: "value", value };
    this.props.onCallChanged({ inputs });
  };

  handleArrayInputValueChanged = (index, arrayIndex, value) => {
    const inputs = [...this.props.inputs];
    const array = [...({ ...(inputs[index] || {}) }.value || [])];
    if (value === null) array.splice(arrayIndex, 1);
    else array[arrayIndex] = value;
    inputs[index] = { type: "value", value: array };
    this.props.onCallChanged({ inputs });
  };

  handleVariableSelectedForInput = (inputIndex, varId) => {
    const inputs = [...this.props.inputs];
    inputs[inputIndex] = varId === 0 ? null : { type: "variable", value: varId };
    this.props.onCallChanged({ inputs });
  };

  handleValueInputChanged = (value) => {
    this.props.onCallChanged({ valueInput: { type: "value", value } });
  };

  handleVariableSelectedForValueInput = (varId) => {
    this.props.onCallChanged({ valueInput: { type: "variable", value: varId } });
  };

  handleVariableSelectedForOutput = (outputIndex, varId) => {
    const outputVarIds = [...this.props.outputVarIds];
    const { numVars } = this.props;
    const prevVarId = outputVarIds[outputIndex];
    outputVarIds[outputIndex] = varId === 0 ? null : varId;
    //todo : rethink that
    for (let i = outputIndex + 1; i < outputVarIds.length; i++) {
      if (outputVarIds[i] > numVars) {
        if (prevVarId > numVars && varId < prevVarId) {
          outputVarIds[i]--;
        } else if (varId > numVars && (prevVarId || 0) <= numVars) {
          outputVarIds[i]++;
        }
      }
    }
    this.props.onCallChanged({ outputVarIds });
  };

  renderContractAddress() {
    const { address } = this.props;
    const { addressError, addressValidationStatus, newAddress, addressFocus } = this.state;

    return (
      <Form.Item validateStatus={addressValidationStatus} hasFeedback help={addressError}>
        <Input
          name="address"
          placeholder={address || "Contract Address"}
          value={addressFocus && newAddress !== null ? newAddress : address}
          onChange={(e) => this.handleContractChanged(e.target.value)}
          onFocus={() => this.handleContractAddressFocus(true)}
          onBlur={() => this.handleContractAddressFocus(false)}
        />
      </Form.Item>
    );
  }

  renderFunctions() {
    const { abi, functionId, address } = this.props;
    const functions = (abi && abi.filter((e) => e.type === "function").map((func, id) => [func.name, id])) || null;

    return (
      functions && (
        <Form.Item>
          <Select key={address} defaultValue={functionId} onChange={this.handleFunctionChanged}>
            {functions.map(([n, i]) => (
              <Option key={i} value={i}>
                {n}
              </Option>
            ))}
          </Select>
        </Form.Item>
      )
    );
  }

  renderValueInput() {
    const { abi, functionId, valueInput, numVars } = this.props;
    if (!abi || isNaN(parseInt(functionId))) return null;
    const func = abi.filter((e) => e.type === "function")[functionId];
    if (!func.payable && func.stateMutability !== "payable") return null;

    const value = valueInput && (valueInput.type === "value" ? valueInput.value : `⟵ Read from Var${valueInput.value}`);
    // variables not yet supported for valueInput
    const possibleVarIds = []; //[...Array(numVars).keys()].map((i) => i + 1);

    return (
      <Form labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
        <Divider orientation="left" plain>
          ETH Sent
        </Divider>
        <Form.Item label="value">
          <Row gutter={16}>
            <Col span={18}>
              <Input
                name="value"
                placeholder="uint256"
                value={value}
                onChange={(e) => this.handleValueInputChanged(e.target.value)}
                disabled={(valueInput && valueInput.type === "variable") || false}
              />
            </Col>
            <Col span={6}>
              {numVars > 0 && (
                <Select
                  defaultValue={(valueInput && valueInput.type === "variable" && valueInput.value) || 0}
                  onChange={(varId) => {
                    this.handleVariableSelectedForValueInput(varId);
                  }}
                >
                  <Option key={0} value={0}>
                    No Variable
                  </Option>
                  {possibleVarIds.map((i) => (
                    <Option key={i} value={i}>
                      Var{i}
                    </Option>
                  ))}
                </Select>
              )}
            </Col>
          </Row>
        </Form.Item>
      </Form>
    );
  }

  renderArrayInput(inputIndex) {
    const { abi, functionId, inputs } = this.props;

    const func = abi.filter((e) => e.type === "function")[functionId];
    const innerType = func.inputs[inputIndex].type.replace("]", "").replace("[", "");
    const arrayValue = inputs[inputIndex] && inputs[inputIndex].value;
    return (
      <Row>
        <Col span={18}>
          <Form.List name={`input-${inputIndex}`} initialValue={arrayValue}>
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, arrayIndex) => (
                  <Form.Item {...field}>
                    <Row>
                      <Col span={22}>
                        <Input
                          value={arrayValue[arrayIndex]}
                          name={innerType}
                          placeholder={innerType}
                          onChange={(e) => this.handleArrayInputValueChanged(inputIndex, arrayIndex, e.target.value)}
                        />
                      </Col>
                      <Col span={2}>
                        <MinusCircleOutlined
                          className="dynamic-delete-button"
                          onClick={() => {
                            this.handleArrayInputValueChanged(inputIndex, arrayIndex, null);
                            remove(field.name);
                          }}
                        />
                      </Col>
                    </Row>
                  </Form.Item>
                ))}
                <Form.Item className="array-input-add-entry">
                  <Button type="dashed" onClick={() => add()} style={{ width: "100%" }} icon={<PlusOutlined />}>
                    Add Entry
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Col>
      </Row>
    );
  }

  renderInputs() {
    const { abi, functionId, inputs, numVars } = this.props;
    if (!abi || isNaN(parseInt(functionId))) return null;
    const func = abi.filter((e) => e.type === "function")[functionId];

    return (
      func.inputs.length > 0 && (
        <Form labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
          <Divider orientation="left" plain>
            Inputs
          </Divider>
          {func.inputs.map(({ name, type }, inputIndex) => {
            const input = (inputs && inputs[inputIndex]) || null;
            const value = input && (input.type === "value" ? input.value : `⟵ Read from Var${input.value}`);
            const possibleVarIds = [...Array(numVars).keys()]
              .map((i) => i + 1)
              .filter((varId) => !(inputs || []).some((input, i) => i !== inputIndex && input && input.type === "variable" && input.value === varId)); // no duplicate varId in input for now

            const field = type.endsWith("[]") ? (
              this.renderArrayInput(inputIndex)
            ) : (
              <Row gutter={16}>
                <Col span={18}>
                  <Input
                    name={type}
                    placeholder={type}
                    value={value}
                    onChange={(e) => this.handleInputValueChanged(inputIndex, e.target.value)}
                    disabled={(input && input.type === "variable") || false}
                  />
                </Col>
                <Col span={6}>
                  {numVars > 0 && (
                    <Select
                      defaultValue={(input && input.type === "variable" && input.value) || 0}
                      onChange={(varId) => {
                        this.handleVariableSelectedForInput(inputIndex, varId);
                      }}
                    >
                      <Option key={0} value={0}>
                        No Variable
                      </Option>
                      {possibleVarIds.map((i) => (
                        <Option key={i} value={i}>
                          Var{i}
                        </Option>
                      ))}
                    </Select>
                  )}
                </Col>
              </Row>
            );
            return (
              <Form.Item label={name || `input ${inputIndex}`} key={inputIndex}>
                {field}
              </Form.Item>
            );
          })}
        </Form>
      )
    );
  }

  renderOutputs() {
    const { abi, functionId, outputVarIds, numVars } = this.props;

    if (!abi || isNaN(parseInt(functionId))) return null;
    const func = abi.filter((e) => e.type === "function")[functionId];

    return (
      func.outputs.length > 0 && (
        <Form labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
          <Divider orientation="left" plain>
            Ouputs
          </Divider>
          {func.outputs.map(({ name, type }, outputIndex) => {
            const outputVarId = outputVarIds && outputVarIds[outputIndex];
            const value = !isNaN(parseInt(outputVarId)) ? `⟶ Written to Var${outputVarId}` : null;

            const numVarsIncludingLowerOutputIndices = Math.max(numVars, Math.max(...outputVarIds.slice(0, outputIndex)));
            const possibleVarIds = [...Array(numVarsIncludingLowerOutputIndices + 1).keys()]
              .map((j) => j + 1)
              .filter((j) => !outputVarIds.slice(0, outputIndex).includes(j));

            return (
              <Form.Item label={name || `output ${outputIndex}`} key={outputIndex}>
                <Row gutter={16}>
                  <Col span={18}>
                    <Input name={type} placeholder={type} value={value} disabled={true} />
                  </Col>
                  <Col span={6}>
                    {
                      <Select
                        defaultValue={0}
                        value={outputVarId === null ? 0 : outputVarId}
                        onChange={(varId) => {
                          this.handleVariableSelectedForOutput(outputIndex, varId);
                        }}
                      >
                        <Option key={0} value={0}>
                          No Variable
                        </Option>
                        {possibleVarIds.map((i) => (
                          <Option key={i} value={i}>
                            Var{i}
                          </Option>
                        ))}
                      </Select>
                    }
                  </Col>
                </Row>
              </Form.Item>
            );
          })}
        </Form>
      )
    );
  }

  render() {
    return (
      <Fragment>
        <Form>
          <Row gutter={16}>
            <Col span={14}>{this.renderContractAddress()}</Col>
            <Col span={10}>{this.renderFunctions()}</Col>
          </Row>
        </Form>
        {this.renderValueInput()}
        {this.renderInputs()}
        {this.renderOutputs()}
      </Fragment>
    );
  }
}

export default Call;
