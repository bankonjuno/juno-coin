const fs = require("fs");
const path = require("path");
const some = require("lodash/some");

const JunoCoinV2 = artifacts.require("JunoCoinV2");
const FiatTokenProxy = artifacts.require("FiatTokenProxy");
const V3Upgrader = artifacts.require("V3Upgrader");

let proxyAdminAddress = "";
let proxyContractAddress = "";
let lostAndFoundAddress = "";
let ownerContractAddress = "";

// Read config file if it exists
if (fs.existsSync(path.join(__dirname, "..", "config.js"))) {
  ({
    PROXY_ADMIN_ADDRESS: proxyAdminAddress,
    PROXY_CONTRACT_ADDRESS: proxyContractAddress,
    LOST_AND_FOUND_ADDRESS: lostAndFoundAddress,
    OWNER_ADDRESS: ownerContractAddress,
  } = require("../config.js"));
}

module.exports = async (deployer, network) => {

  proxyContractAddress =
    proxyContractAddress || (await FiatTokenProxy.deployed()).address;

  if (!lostAndFoundAddress) {
    throw new Error("LOST_AND_FOUND_ADDRESS must be provided in config.js");
  }

  const jcv2 = await JunoCoinV2.deployed();

  console.log(`Proxy Admin:     ${proxyAdminAddress}`);
  console.log(`FiatTokenProxy:  ${proxyContractAddress}`);
  console.log(`JunoCoinV1:   ${jcv2.address}`);
  console.log(`Lost & Found:    ${lostAndFoundAddress.address}`);
  console.log(`owner:  ${ownerContractAddress}`);

  if (!proxyAdminAddress) {
    throw new Error("PROXY_ADMIN_ADDRESS must be provided in config.js");
  }

  console.log("Deploying V3Upgrader contract...");

  const v3Upgrader = await deployer.deploy(
    V3Upgrader,
    proxyContractAddress,
    jcv2.address,
    proxyAdminAddress,
    ownerContractAddress,
  );

  console.log(
    `>>>>>>> Deployed V3Upgrader at ${v3Upgrader.address} <<<<<<<`
  );
};
