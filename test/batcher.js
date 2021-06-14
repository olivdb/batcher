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
  const balanceFun = Coolcoin.abi.find((f) => f.name === "balanceOf");
  const allowanceFun = Coolcoin.abi.find((f) => f.name === "allowance");
  const approveFun = Coolcoin.abi.find((f) => f.name === "approve");
  const stakeFun = StakingRewards.abi.find((f) => f.name === "stake");

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
    await cool.mint(accounts[0], "1000000000");
  });

  describe("1 var", async () => {
    it("computes no batch gasUsed", async () => {
      async function getNoBatchGasCost() {
        const bal = await cool.balanceOf(accounts[0]);
        const balanceData = web3.eth.abi.encodeFunctionCall(balanceFun, [accounts[0]]);
        let totalGas = 0;
        let txR = await web3.eth.sendTransaction({ to: cool.address, data: balanceData, from: accounts[0], value: 0 });
        totalGas += txR.gasUsed;
        txR = await cool.approve(staker.address, bal);
        totalGas += txR.receipt.gasUsed;
        txR = await staker.stake(bal);
        totalGas += txR.receipt.gasUsed;
        return totalGas;
      }
      const noBatchGasUsed = await getNoBatchGasCost();
      console.log({ noBatchGasUsed });
    });

    it("computes no var gasUsed", async () => {
      async function getNoVarGasCost() {
        const bal = await cool.balanceOf(accounts[0]);
        const balanceData = web3.eth.abi.encodeFunctionCall(balanceFun, [batcher.address]);
        const approveData = web3.eth.abi.encodeFunctionCall(approveFun, [staker.address, bal]);
        const stakeData = web3.eth.abi.encodeFunctionCall(stakeFun, [bal]);
        const txR = await batcher.execute(
          [
            {
              to: cool.address,
              data: balanceData,
              value: 0,
              outVarIndex: 0,
              varPositions: [],
            },
            {
              to: cool.address,
              data: approveData,
              value: 0,
              outVarIndex: 0,
              varPositions: [],
            },
            {
              to: staker.address,
              data: stakeData,
              value: 0,
              outVarIndex: 0,
              varPositions: [],
            },
          ],
          0
        );
        return txR.receipt.gasUsed;
      }
      const noVarGasUsed = await getNoVarGasCost();
      console.log({ noVarGasUsed });
    });

    it("approve full balance & stake full allowance (1 var)", async () => {
      const initialBalance = (await cool.balanceOf(batcher.address)).toString();
      const balanceData = web3.eth.abi.encodeFunctionCall(balanceFun, [batcher.address]);
      const approveData = web3.eth.abi.encodeFunctionCall(approveFun, [staker.address, 0]);
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
      assert.equal(initialBalance, staked);
      console.log({ withVarGasUsed: txR.receipt.gasUsed });
    });
  });

  describe("2 var", async () => {
    it("computes no batch gasUsed", async () => {
      async function getNoBatchGasCost() {
        const bal = await cool.balanceOf(accounts[0]);
        const balanceData = web3.eth.abi.encodeFunctionCall(balanceFun, [accounts[0]]);
        const allowanceData = web3.eth.abi.encodeFunctionCall(allowanceFun, [accounts[0], staker.address]);

        let totalGas = 0;
        let txR = await web3.eth.sendTransaction({ to: cool.address, data: balanceData, from: accounts[0], value: 0 });
        totalGas += txR.gasUsed;
        txR = await cool.approve(staker.address, bal);
        totalGas += txR.receipt.gasUsed;
        txR = await web3.eth.sendTransaction({ to: cool.address, data: allowanceData, from: accounts[0], value: 0 });
        totalGas += txR.gasUsed;
        txR = await staker.stake(bal);
        totalGas += txR.receipt.gasUsed;
        return totalGas;
      }
      const noBatchGasUsed = await getNoBatchGasCost();
      console.log({ noBatchGasUsed });
    });

    it("computes no var gasUsed", async () => {
      async function getNoVarGasCost() {
        const bal = await cool.balanceOf(accounts[0]);
        const balanceData = web3.eth.abi.encodeFunctionCall(balanceFun, [batcher.address]);
        const approveData = web3.eth.abi.encodeFunctionCall(approveFun, [staker.address, bal]);
        const allowanceData = web3.eth.abi.encodeFunctionCall(allowanceFun, [batcher.address, staker.address]);
        const stakeData = web3.eth.abi.encodeFunctionCall(stakeFun, [bal]);

        const txR = await batcher.execute(
          [
            {
              to: cool.address,
              data: balanceData,
              value: 0,
              outVarIndex: 0,
              varPositions: [],
            },
            {
              to: cool.address,
              data: approveData,
              value: 0,
              outVarIndex: 0,
              varPositions: [],
            },
            {
              to: cool.address,
              data: allowanceData,
              value: 0,
              outVarIndex: 0,
              varPositions: [],
            },
            {
              to: staker.address,
              data: stakeData,
              value: 0,
              outVarIndex: 0,
              varPositions: [],
            },
          ],
          0
        );
        return txR.receipt.gasUsed;
      }
      const noVarGasUsed = await getNoVarGasCost();
      console.log({ noVarGasUsed });
    });

    it("approve full balance & stake full allowance (2 vars)", async () => {
      const initialBalance = (await cool.balanceOf(batcher.address)).toString();
      const balanceData = web3.eth.abi.encodeFunctionCall(balanceFun, [batcher.address]);
      const approveData = web3.eth.abi.encodeFunctionCall(approveFun, [staker.address, 0]);
      const allowanceData = web3.eth.abi.encodeFunctionCall(allowanceFun, [batcher.address, staker.address]);
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
            data: allowanceData,
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
      assert.equal(initialBalance, staked);
      console.log({ withVarGasUsed: txR.receipt.gasUsed });
    });
  });
});
