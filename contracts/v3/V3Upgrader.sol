/**
 * SPDX-License-Identifier: MIT
 *
 * Copyright (c) 2018-2020 CENTRE SECZ
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

pragma solidity 0.6.12;

import { Ownable } from "../v1/Ownable.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { FiatTokenProxy } from "../v1/FiatTokenProxy.sol";
import { JunoCoinV2 } from "./JunoCoinV2.sol";
import { V2UpgraderHelper } from "../v2/upgrader/V2UpgraderHelper.sol";

contract V3Upgrader is Ownable {

    using SafeMath for uint256;

    FiatTokenProxy private _proxy;
    JunoCoinV2 private _implementation;
    address private _newProxyAdmin;
    V2UpgraderHelper private _helper;
    address private _newOwner;

    constructor(
        FiatTokenProxy proxy,
        JunoCoinV2 implementation,
        address newProxyAdmin,
        address newOwner
    ) public Ownable() {
        _proxy = proxy;
        _implementation = implementation;
        _newProxyAdmin = newProxyAdmin;
        _newOwner = newOwner;
        _helper = new V2UpgraderHelper(address(proxy));
        setOwner(_newOwner);
    }


    /**
     * @notice The address of the FiatTokenProxy contract
     * @return Contract address
     */
    function proxy() external view returns (address) {
        return address(_proxy);
    }

    /**
     * @notice The address of the FiatTokenV2 implementation contract
     * @return Contract address
     */
    function implementation() external view returns (address) {
        return address(_implementation);
    }

    /**
     * @notice The address of the V2UpgraderHelper contract
     * @return Contract address
     */
    function helper() external view returns (address) {
        return address(_helper);
    }

    /**
     * @notice The address to which the proxy admin role will be transferred
     * after the upgrade is completed
     * @return Address
     */
    function newProxyAdmin() external view returns (address) {
        return _newProxyAdmin;
    }

    /**
     * @notice Withdraw any USDC in the contract
     */
    function withdrawUSDC() public onlyOwner {
        IERC20 usdc = IERC20(address(_proxy));
        uint256 balance = usdc.balanceOf(address(this));
        if (balance > 0) {
            require(
                usdc.transfer(msg.sender, balance),
                "V3Upgrader: failed to withdraw JC"
            );
        }
    }

    /**
     * @notice Transfer proxy admin role to newProxyAdmin, and self-destruct
     */
    function abortUpgrade() external onlyOwner {
        // Transfer proxy admin role
        _proxy.changeAdmin(_newProxyAdmin);

        // Tear down
        _helper.tearDown();
        selfdestruct(msg.sender);
    }

    /**
     * @notice Upgrade, transfer proxy admin role to a given address, run a
     * sanity test, and tear down the upgrader contract, in a single atomic
     * transaction. It rolls back if there is an error.
     */
    function upgrade() external onlyOwner {
        // The helper needs to be used to read contract state because
        // AdminUpgradeabilityProxy does not allow the proxy admin to make
        // proxy calls.

        // Check that this contract sufficient funds to run the tests
        uint256 contractBal = _helper.balanceOf(address(this));
        require(contractBal >= 2e5, "V3Upgrader: 0.2 JC needed");

        uint256 callerBal = _helper.balanceOf(msg.sender);

        // Keep original contract metadata
        string memory name = _helper.name();
        string memory symbol = _helper.symbol();
        uint8 decimals = _helper.decimals();
        string memory currency = _helper.currency();
        address masterMinter = _helper.masterMinter();
        address owner = _helper.fiatTokenOwner();
        address pauser = _helper.pauser();
        address blacklister = _helper.blacklister();

        // Change implementation contract address
        _proxy.upgradeTo(address(_implementation));

        // Transfer proxy admin role
        _proxy.changeAdmin(_newProxyAdmin);

        // Initialize V2 contract
        JunoCoinV2 jcv2 = JunoCoinV2(address(_proxy));
        // jcv1.initializeJCV1();

        // Sanity test
        // Check metadata
        require(
            keccak256(bytes(name)) == keccak256(bytes(jcv2.name())) &&
                keccak256(bytes(symbol)) == keccak256(bytes(jcv2.symbol())) &&
                decimals == jcv2.decimals() &&
                keccak256(bytes(currency)) ==
                keccak256(bytes(jcv2.currency())) &&
                masterMinter == jcv2.masterMinter() &&
                owner == jcv2.owner() &&
                pauser == jcv2.pauser() &&
                blacklister == jcv2.blacklister(),
            "V3Upgrader: metadata test failed"
        );

        // Test balanceOf
        require(
            jcv2.balanceOf(address(this)) == contractBal,
            "V2_1Upgrader: balanceOf test failed"
        );

        // Test transfer
        require(
            jcv2.transfer(msg.sender, 1e5) &&
                jcv2.balanceOf(msg.sender) == callerBal.add(1e5) &&
                jcv2.balanceOf(address(this)) == contractBal.sub(1e5),
            "V2_1Upgrader: transfer test failed"
        );

        // Test approve/transferFrom
        require(
            jcv2.approve(address(_helper), 1e5) &&
                jcv2.allowance(address(this), address(_helper)) == 1e5 &&
                _helper.transferFrom(address(this), msg.sender, 1e5) &&
                jcv2.allowance(address(this), msg.sender) == 0 &&
                jcv2.balanceOf(msg.sender) == callerBal.add(2e5) &&
                jcv2.balanceOf(address(this)) == contractBal.sub(2e5),
            "V3Upgrader: approve/transferFrom test failed"
        );

        // Transfer any remaining USDC to the caller
        withdrawUSDC();

        // Tear down
        _helper.tearDown();
        selfdestruct(msg.sender);
    }
}