const Batcher = artifacts.require("Batcher");
const Coolcoin = artifacts.require("Coolcoin");
const Shitcoin = artifacts.require("Shitcoin");
const IUniswapV2Factory = artifacts.require("IUniswapV2Factory");
const IUniswapV2Router02 = artifacts.require("IUniswapV2Router02");
const StakingRewards = artifacts.require("StakingRewards");

const BATCHER = null; //"0x07C213635FeEb056D111D612B289ED2c818Ecb11";
const COOL = null; //"0xbBd22Ad16d07F2232E2Ca66dB49c5c1C1CA9ee0F";
const SHIT = null; //"0x6736465Af08a3B5988f07C2e5e284885EDbD564F";
const STAKER = null; //"0x4F62E9b72E55034ef7d494B5c8Ba223661cA70d2";
const WETH = "0xc778417e063141139fce010982780140aa0cd5ab";
const UNISWAP_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const MAX_UINT = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

const delay = require("delay");
const { verify } = require("./verify");

module.exports = function (deployer, network, accounts) {
  return deployer.then(async () => {
    let txR;
    // Creating tokens if necessary
    const factory = await IUniswapV2Factory.at(UNISWAP_FACTORY);
    const router = await IUniswapV2Router02.at(UNISWAP_ROUTER);
    const cool = COOL ? await Coolcoin.at(COOL) : await deployer.deploy(Coolcoin, "Coolcoin", "COOL");
    const shit = SHIT ? await Shitcoin.at(SHIT) : await deployer.deploy(Shitcoin, "Shitcoin", "SHIT");

    // Deploy & Fund batcher
    const batcher = BATCHER ? await Batcher.at(BATCHER) : await deployer.deploy(Batcher);
    await cool.mint(batcher.address, "1000000000");
    await shit.mint(batcher.address, "1000000000");

    // Creating WETH-COOL and SHIT-COOL pairs
    txR = await factory.createPair(cool.address, WETH);
    console.log("factory.createPair", txR.receipt.logs);
    txR = await factory.createPair(shit.address, cool.address);
    console.log("factory.createPair", txR.receipt.logs);
    const wethCoolPairAddress = await factory.getPair(WETH, cool.address);
    const shitCoolPairAddress = await factory.getPair(shit.address, cool.address);
    console.log({ wethCoolPairAddress, shitCoolPairAddress });

    // Minting SHIT and COOL to add initial liquidity
    txR = await shit.mint(accounts[0], web3.utils.toWei("5000"));
    console.log("shit.mint", txR.receipt.logs);
    txR = await cool.mint(accounts[0], web3.utils.toWei("5000"));
    console.log("cool.mint", txR.receipt.logs);

    // Adding initial liquidity to COOL-SHIT
    txR = await cool.approve(UNISWAP_ROUTER, MAX_UINT);
    console.log("cool.approve", txR.receipt.logs);
    txR = await shit.approve(UNISWAP_ROUTER, MAX_UINT);
    console.log("shit.approve", txR.receipt.logs);
    const amountADesired = web3.utils.toWei("1000");
    const amountBDesired = web3.utils.toWei("2000");
    const amountAMin = amountADesired;
    const amountBMin = amountBDesired;
    const deadline = MAX_UINT;
    txR = await router.addLiquidity(cool.address, shit.address, amountADesired, amountBDesired, amountAMin, amountBMin, accounts[0], deadline);
    console.log("router.addLiquidity", txR.receipt.logs);

    // Adding initial liquidity to  COOL-WETH
    const amountTokenDesired = web3.utils.toWei("100");
    const amountTokenMin = amountTokenDesired;
    const amountETHMin = 1;
    let value = web3.utils.toWei("1");
    txR = await router.addLiquidityETH(cool.address, amountTokenDesired, amountTokenMin, amountETHMin, accounts[0], deadline, {
      value,
    });
    console.log("router.addLiquidityETH", txR.receipt.logs);

    const reward = web3.utils.toWei("5000");
    const staker = STAKER ? await StakingRewards.at(STAKER) : await deployer.deploy(StakingRewards, wethCoolPairAddress.address, shit.address);
    await shit.mint(staker.address, reward);
    await staker.setRewardDistribution(accounts[0]);
    await staker.notifyRewardAmount(reward);

    await delay(6000);
    await verify(["Coolcoin", "Shitcoin", "Batcher", "StakingRewards"], network);
  });
};
