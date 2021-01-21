const { isMainThread } = require("worker_threads");

const Batcher = artifacts.require("Batcher");
const StakingRewards = artifacts.require("StakingRewards");
const Coolcoin = artifacts.require("Coolcoin");
const Shitcoin = artifacts.require("Shitcoin");

contract("Batcher", (accounts) => {
  let staker;
  let batcher;
  let cool;
  let shit;

  before(async () => {
    cool = await Coolcoin.new();
    shit = await Shitcoin.new();
    staker = await StakingRewards.new(cool.address, shit.address);
    const reward = web3.utils.toWei("5000");
    await shit.mint(staker.address, reward);
    await staker.setRewardDistribution(accounts[0]);
    await staker.notifyRewardAmount(reward);
  });

  beforeEach(async () => {
    batcher = await Batcher.new();
    await cool.mint(batcher.address, "1000000000");
  });

  it("approve full balance & stake full allowance (1 var)", async () => {
    const balanceFun = Coolcoin.abi.find((f) => f.name === "balanceOf");
    const balanceData = web3.eth.abi.encodeFunctionCall(balanceFun, [batcher.address]);

    const approveFun = Coolcoin.abi.find((f) => f.name === "approve");
    const approveData = web3.eth.abi.encodeFunctionCall(approveFun, [staker.address, 0]);

    const stakeFun = StakingRewards.abi.find((f) => f.name === "stake");
    const stakeData = web3.eth.abi.encodeFunctionCall(stakeFun, [0]);

    const txR = await batcher.execute(
      [
        {
          to: cool.address,
          data: balanceData,
          value: 0,
          outVarIndex: 1,
          varPositions: [0],
        },
        {
          to: cool.address,
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
    const balanceFun = Coolcoin.abi.find((f) => f.name === "balanceOf");
    const balanceData = web3.eth.abi.encodeFunctionCall(balanceFun, [batcher.address]);

    const approveFun = Coolcoin.abi.find((f) => f.name === "approve");
    const approveData = web3.eth.abi.encodeFunctionCall(approveFun, [staker.address, 0]);

    const allowanceFun = Coolcoin.abi.find((f) => f.name === "allowance");
    const allowanceData = web3.eth.abi.encodeFunctionCall(allowanceFun, [batcher.address, staker.address]);

    const stakeFun = StakingRewards.abi.find((f) => f.name === "stake");
    const stakeData = web3.eth.abi.encodeFunctionCall(stakeFun, [0]);

    const txR = await batcher.execute(
      [
        {
          to: cool.address,
          data: balanceData,
          value: 0,
          outVarIndex: 1,
          varPositions: [0, 0],
        },
        {
          to: cool.address,
          data: approveData,
          value: 0,
          outVarIndex: 0,
          varPositions: [36, 0],
        },
        {
          to: cool.address,
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
