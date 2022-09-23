const fs = require("fs");
const path = require("path");
const some = require("lodash/some");

const JunoCoinV2 = artifacts.require("JunoCoinV2");
const FiatTokenProxy = artifacts.require("FiatTokenProxy");

let proxyContractAddress = "";

const THROWAWAY_ADDRESS = "0x0000000000000000000000000000000000000001";

// Read config file if it exists
if (fs.existsSync(path.join(__dirname, "..", "config.js"))) {
  ({ PROXY_CONTRACT_ADDRESS: proxyContractAddress } = require("../config.js"));
}

module.exports = async (deployer, network) => {
  if (
    !proxyContractAddress ||
    some(["development", "coverage"], (v) => network.includes(v))
  ) {
    proxyContractAddress = (await FiatTokenProxy.deployed()).address;
  }

  console.log(`FiatTokenProxy: ${proxyContractAddress}`);

  console.log("Deploying JunoCoinV2 implementation contract...");
  await deployer.deploy(JunoCoinV2);

  const jcv2 = await JunoCoinV2.deployed();
  console.log("Deployed JunoCoinV2 at", jcv2.address);
  console.log(
    "Initializing JunoCoinV2 implementation contract with dummy values..."
  );
  await jcv2.initialize(
    "",
    "",
    "",
    0,
    THROWAWAY_ADDRESS,
    THROWAWAY_ADDRESS,
    THROWAWAY_ADDRESS,
    THROWAWAY_ADDRESS
  );
  await jcv2.initializeV2("");
  await jcv2.initializeV2_1(THROWAWAY_ADDRESS);
  await jcv2.initializeJCV2();
};