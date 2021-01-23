const Batcher = artifacts.require("Batcher");
const BatcherFactory = artifacts.require("BatcherFactory");
const Coolcoin = artifacts.require("Coolcoin");
const Shitcoin = artifacts.require("Shitcoin");
const IUniswapV2Factory = artifacts.require("IUniswapV2Factory");
const IUniswapV2Router02 = artifacts.require("IUniswapV2Router02");
const StakingRewards = artifacts.require("StakingRewards");
const StakingRewardsPool2 = artifacts.require("StakingRewardsPool2");
const MathContract = artifacts.require("Math");

const BATCHER = "0x32116Ad8Ac3879D53074150d52B122f438a414C9";
const BATCHER_FACTORY = "0x697abff89Ece0bB352124Eed4116327c54BE71E3";
const COOL = "0x6eEEDB0d657474f0eb88218c5f9C4aF8D75C731d";
const SHIT = "0xe9AAB48Aa34D16D938e237BEB40A5E4fc9Bd5bD1";
const STAKER = "0xFf40B7C6e612293DF16453CDC152527610f5f512";
const STAKER2 = "0x82F21BFE360Ce91E7f4e737F7470A1bb435548fA";
const WETH = "0xc778417e063141139fce010982780140aa0cd5ab";
const MATH = "0x045bC15173D2D9B630DC0d17EC3A120DA62F61ed";
const UNISWAP_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const MAX_UINT = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

const delay = require("delay");
const { verify } = require("./verify");

module.exports = function (deployer, network, accounts) {
  return deployer.then(async () => {
    if (network !== "rinkeby") return;

    // Creating tokens if necessary
    const math = MATH ? await MathContract.at(MATH) : await deployer.deploy(MathContract);
    const factory = await IUniswapV2Factory.at(UNISWAP_FACTORY);
    const router = await IUniswapV2Router02.at(UNISWAP_ROUTER);
    const cool = COOL ? await Coolcoin.at(COOL) : await deployer.deploy(Coolcoin, "Coolcoin", "COOL");
    const shit = SHIT ? await Shitcoin.at(SHIT) : await deployer.deploy(Shitcoin, "Shitcoin", "SHIT");

    // Deploy & Fund batcher
    const bfac = BATCHER_FACTORY ? await BatcherFactory.at(BATCHER_FACTORY) : await deployer.deploy(BatcherFactory);
    const batcher = await Batcher.at(BATCHER || (await bfac.build()).receipt.logs[0].args.batcher);
    await cool.mint(batcher.address, "1000000000");
    await shit.mint(batcher.address, "1000000000");

    // Creating WETH-COOL, WETH-SHIT and SHIT-COOL pairs
    await factory.createPair(cool.address, WETH);
    await factory.createPair(shit.address, cool.address);
    await factory.createPair(shit.address, WETH);
    const wethShitPairAddress = await factory.getPair(WETH, shit.address);
    const wethCoolPairAddress = await factory.getPair(WETH, cool.address);
    const shitCoolPairAddress = await factory.getPair(shit.address, cool.address);
    console.log({ wethCoolPairAddress, wethShitPairAddress, shitCoolPairAddress });

    // Minting SHIT and COOL to add initial liquidity
    console.log("shit.mint");
    await shit.mint(accounts[0], web3.utils.toWei("5000"));
    console.log("cool.mint");
    await cool.mint(accounts[0], web3.utils.toWei("5000"));

    // Adding initial liquidity to COOL-SHIT
    console.log("cool.approve");
    await cool.approve(UNISWAP_ROUTER, MAX_UINT);
    console.log("shit.approve");
    await shit.approve(UNISWAP_ROUTER, MAX_UINT);
    const amountADesired = web3.utils.toWei("1000");
    const amountBDesired = web3.utils.toWei("2000");
    const amountAMin = amountADesired;
    const amountBMin = amountBDesired;
    const deadline = MAX_UINT;
    console.log("router.addLiquidity COOL-SHIT");
    await router.addLiquidity(cool.address, shit.address, amountADesired, amountBDesired, amountAMin, amountBMin, accounts[0], deadline);

    // Adding initial liquidity to  COOL-WETH
    const amountTokenDesired = web3.utils.toWei("100");
    const amountTokenMin = amountTokenDesired;
    const amountETHMin = 1;
    const value = web3.utils.toWei("1");
    console.log("router.addLiquidityETH");
    await router.addLiquidityETH(cool.address, amountTokenDesired, amountTokenMin, amountETHMin, accounts[0], deadline, {
      value,
    });

    // Adding initial liquidity to  SHIT-WETH
    console.log("router.addLiquidityETH");
    await router.addLiquidityETH(shit.address, amountTokenDesired, amountTokenMin, amountETHMin, accounts[0], deadline, {
      value,
    });

    console.log("creating pool1");
    const reward = web3.utils.toWei("5000");
    const staker = STAKER ? await StakingRewards.at(STAKER) : await deployer.deploy(StakingRewards, wethCoolPairAddress, shit.address);
    await shit.mint(staker.address, reward);
    await staker.setRewardDistribution(accounts[0]);
    await staker.notifyRewardAmount(reward);

    console.log("creating pool2");
    const reward2 = web3.utils.toWei("5000");
    const staker2 = STAKER2 ? await StakingRewardsPool2.at(STAKER) : await deployer.deploy(StakingRewardsPool2, wethShitPairAddress, shit.address);
    await shit.mint(staker2.address, reward2);
    await staker2.setRewardDistribution(accounts[0]);
    await staker2.notifyRewardAmount(reward2);

    await delay(6000);
    await verify(["Coolcoin", "Shitcoin", "Batcher", "BatcherFactory", "StakingRewards", "StakingRewardsPool2"], network);
  });
};
