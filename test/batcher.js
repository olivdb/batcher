const { isMainThread } = require("worker_threads");

const Batcher = artifacts.require("Batcher");
const Staker = artifacts.require("Staker");
const ERC20 = artifacts.require("Token");

contract("Batcher", (accounts) => {
  let staker;
  let batcher;
  let erc20;

  before(async () => {
    erc20 = await ERC20.new();
    staker = await Staker.new(erc20.address);
  });

  beforeEach(async () => {
    batcher = await Batcher.new();
    await erc20.mint(batcher.address, "1000000000");
  });

  it("approve full balance & stake full allowance (1 var)", async () => {
    const balanceFun = ERC20.abi.find((f) => f.name === "balanceOf");
    const balanceData = web3.eth.abi.encodeFunctionCall(balanceFun, [
      batcher.address,
    ]);

    const approveFun = ERC20.abi.find((f) => f.name === "approve");
    const approveData = web3.eth.abi.encodeFunctionCall(approveFun, [
      staker.address,
      0,
    ]);

    const stakeFun = Staker.abi.find((f) => f.name === "stake");
    const stakeData = web3.eth.abi.encodeFunctionCall(stakeFun, [0]);

    const txR = await batcher.execute(
      [
        {
          to: erc20.address,
          data: balanceData,
          value: 0,
          outVarIndex: 1,
          varPositions: [0],
        },
        {
          to: erc20.address,
          data: approveData,
          value: 0,
          outVarIndex: 0,
          varPositions: [36],
        },
        {
          to: staker.address,
          data: stakeData,
          value: 0,
          outVarIndex: 0,
          varPositions: [4],
        },
      ],
      1
    );
    const staked = (await staker.balanceOf(batcher.address)).toString();
    console.log({ staked: staked.toString() });
    console.log({ gasUsed: txR.receipt.gasUsed.toString() });
  });

  it("approve full balance & stake full allowance (2 vars)", async () => {
    const balanceFun = ERC20.abi.find((f) => f.name === "balanceOf");
    const balanceData = web3.eth.abi.encodeFunctionCall(balanceFun, [
      batcher.address,
    ]);

    const approveFun = ERC20.abi.find((f) => f.name === "approve");
    const approveData = web3.eth.abi.encodeFunctionCall(approveFun, [
      staker.address,
      0,
    ]);

    const allowanceFun = ERC20.abi.find((f) => f.name === "allowance");
    const allowanceData = web3.eth.abi.encodeFunctionCall(allowanceFun, [
      batcher.address,
      staker.address,
    ]);

    const stakeFun = Staker.abi.find((f) => f.name === "stake");
    const stakeData = web3.eth.abi.encodeFunctionCall(stakeFun, [0]);

    const txR = await batcher.execute(
      [
        {
          to: erc20.address,
          data: balanceData,
          value: 0,
          outVarIndex: 1,
          varPositions: [0, 0],
        },
        {
          to: erc20.address,
          data: approveData,
          value: 0,
          outVarIndex: 0,
          varPositions: [36, 0],
        },
        {
          to: erc20.address,
          data: balanceData,
          value: 0,
          outVarIndex: 2,
          varPositions: [0, 0],
        },
        {
          to: staker.address,
          data: stakeData,
          value: 0,
          outVarIndex: 0,
          varPositions: [0, 4],
        },
      ],
      2
    );
    const staked = (await staker.balanceOf(batcher.address)).toString();
    console.log({
      staked: staked.toString(),
      gasUsed: txR.receipt.gasUsed.toString(),
    });
  });
});
