const fs = require("fs");
const path = require("path");
const some = require("lodash/some");

const JunoCoinV1 = artifacts.require("JunoCoinV1");
const FiatTokenProxy = artifacts.require("FiatTokenProxy");

const THROWAWAY_ADDRESS = "0x0000000000000000000000000000000000000001";

let proxyAdminAddress = "";
let ownerAddress = "";
let masterMinterAddress = "";
let pauserAddress = "";
let blacklisterAddress = "";

// Read config file if it exists
if (fs.existsSync(path.join(__dirname, "..", "config.js"))) {
  ({
    PROXY_ADMIN_ADDRESS: proxyAdminAddress,
    OWNER_ADDRESS: ownerAddress,
    MASTERMINTER_ADDRESS: masterMinterAddress,
    PAUSER_ADDRESS: pauserAddress,
    BLACKLISTER_ADDRESS: blacklisterAddress,
  } = require("../config.js"));
}

module.exports = async (deployer, network) => {


  console.log(`Proxy Admin:   ${proxyAdminAddress}`);
  console.log(`Owner:         ${ownerAddress}`);
  console.log(`Master Minter: ${masterMinterAddress}`);
  console.log(`Pauser:        ${pauserAddress}`);
  console.log(`Blacklister:   ${blacklisterAddress}`);

  if (
    !proxyAdminAddress ||
    !ownerAddress ||
    !masterMinterAddress ||
    !pauserAddress ||
    !blacklisterAddress
  ) {
    throw new Error(
      "PROXY_ADMIN_ADDRESS, OWNER_ADDRESS, MASTERMINTER_ADDRESS, PAUSER_ADDRESS, and BLACKLISTER_ADDRESS must be provided in config.js"
    );
  }

  console.log("Deploying implementation contract...");
  await deployer.deploy(JunoCoinV1);
  const junoCoinV1 = await JunoCoinV1.deployed();
  console.log("Deployed implementation contract at", JunoCoinV1.address);

  console.log("Initializing implementation contract with dummy values...");
  await junoCoinV1.initialize(
    "",
    "",
    "",
    0,
    THROWAWAY_ADDRESS,
    THROWAWAY_ADDRESS,
    THROWAWAY_ADDRESS,
    THROWAWAY_ADDRESS
  );

  console.log("Deploying proxy contract...");
  await deployer.deploy(FiatTokenProxy, JunoCoinV1.address);
  const fiatTokenProxy = await FiatTokenProxy.deployed();
  console.log("Deployed proxy contract at", FiatTokenProxy.address);

  console.log("Reassigning proxy contract admin...");
  // need to change admin first, or the call to initialize won't work
  // since admin can only call methods in the proxy, and not forwarded methods
  await fiatTokenProxy.changeAdmin(proxyAdminAddress);

  console.log("Initializing proxy contract...");
  // Pretend that the proxy address is a FiatTokenV1 - this is fine because the
  // proxy will forward all the calls to the FiatTokenV1 impl
  const proxyAsV1 = await JunoCoinV1.at(FiatTokenProxy.address);
  await proxyAsV1.initialize(
    "JUNO COIN",
    "JCOIN",
    "JCOIN",
    6,
    masterMinterAddress,
    pauserAddress,
    blacklisterAddress,
    ownerAddress
  );
};
