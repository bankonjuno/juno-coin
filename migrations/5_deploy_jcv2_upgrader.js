const fs = require("fs");
const path = require("path");
const some = require("lodash/some");

const JunoCoinV1 = artifacts.require("JunoCoinV2");
const FiatTokenProxy = artifacts.require("FiatTokenProxy");
const V3Upgrader = artifacts.require("V3Upgrader");

let proxyAdminAddress = "";
let proxyContractAddress = "";
let lostAndFoundAddress = "";
let ownerContractAddress = ""

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
  // if (some(["development", "coverage"], (v) => network.includes(v))) {
  //   // DO NOT USE THESE ADDRESSES IN PRODUCTION
  //   proxyAdminAddress = "0x2F560290FEF1B3Ada194b6aA9c40aa71f8e95598";
  //   proxyContractAddress = (await FiatTokenProxy.deployed()).address;
  //   lostAndFoundAddress = "0x610Bb1573d1046FCb8A70Bbbd395754cD57C2b60";
  // }
  proxyContractAddress =
    proxyContractAddress || (await FiatTokenProxy.deployed()).address;

  if (!lostAndFoundAddress) {
    throw new Error("LOST_AND_FOUND_ADDRESS must be provided in config.js");
  }

  const jcv1 = await JunoCoinV1.deployed();

  console.log(`Proxy Admin:     ${proxyAdminAddress}`);
  console.log(`FiatTokenProxy:  ${proxyContractAddress}`);
  console.log(`JunoCoinV1:   ${jcv1.address}`);
  console.log(`Lost & Found:    ${lostAndFoundAddress.address}`);
  console.log(`owner:  ${ownerContractAddress}`);

  if (!proxyAdminAddress) {
    throw new Error("PROXY_ADMIN_ADDRESS must be provided in config.js");
  }

  console.log("Deploying V2_1Upgrader contract...");

  const v3Upgrader = await deployer.deploy(
    V3Upgrader,
    proxyContractAddress,
    jcv1.address,
    proxyAdminAddress,
    ownerContractAddress,
  );

  console.log(
    `>>>>>>> Deployed V3Upgrader at ${v3Upgrader.address} <<<<<<<`
  );
};
