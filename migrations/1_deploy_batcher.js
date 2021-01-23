const BatcherFactory = artifacts.require("BatcherFactory");
const delay = require("delay");
const { verify } = require("./verify");

module.exports = function (deployer, network, accounts) {
  return deployer.then(async () => {
    await deployer.deploy(BatcherFactory);

    await delay(6000);
    await verify(["BatcherFactory"], network);
  });
};
