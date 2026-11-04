// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {GigEscrow} from "../src/GigEscrow.sol";
import {IGroundedReputation} from "../src/interfaces/IGroundedReputation.sol";
import {IIdentityRegistry} from "../src/interfaces/IIdentityRegistry.sol";
import {IReceiptRouter} from "../src/interfaces/IReceiptRouter.sol";

/// @dev forge script script/Deploy.s.sol --rpc-url $NEXT_PUBLIC_RPC_URL --account $DEPLOYER_ACCOUNT --broadcast
///      Env: FEE_RECIPIENT. Grounded addresses are fixed Monad Testnet deployments.
contract Deploy is Script {
    function run() external returns (GigEscrow escrow) {
        require(block.chainid == 10_143, "Monad Testnet only");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");

        vm.startBroadcast();
        escrow = new GigEscrow(
            IERC20(0x534b2f3A21130d7a60830c2Df862319e593943A3),
            IReceiptRouter(0xbE9dbCc36240b358233B2019253178B02D44db54),
            IGroundedReputation(0xCA50d5222566F313D9fb890F2bce144381445356),
            IIdentityRegistry(0x8004A818BFB912233c491871b3d84c89A494BD9e),
            feeRecipient,
            500,
            7 days
        );
        vm.stopBroadcast();

        console.log("GigEscrow", address(escrow));
        vm.writeJson(vm.toString(address(escrow)), "../deployments/10143.json", ".gigEscrow");
    }
}
