import { Command } from "commander";

import cliHelper from "./cli-helper";

import { ethers } from "hardhat";
import * as hre from "hardhat";
import * as path from "path";

const program = new Command("deploy-reward-distributor")
    .description("deploy RewardDistributor contract")
    .option("--network [value]", "specific network")
    .option(
        "--reward-token-address <address>",
        "address of the reward token contract"
    )
    .parse(process.argv);

interface Input {}

(async (): Promise<void> => {
    const { network, rewardTokenAddress } = program.opts();

    if (network) {
        console.log(`changing network to: ${network} ...`);
        await hre.changeNetwork(network);
        console.log(`changed network to: ${network} ...`);
        console.log(hre.config["networks"][network]);
    }

    const [deployer] = await ethers.getSigners();
    console.log("deploying contract with the account:", deployer.address);
    console.log(
        "account balance:",
        (await ethers.provider.getBalance(deployer.address)).toString()
    );

    console.log("compiling ...");
    await hre.run("compile");
    console.log("compiling ...done");

    console.log("verifying reward token contract...");
    const rewardToken = await ethers.getContractAt("ERC20", rewardTokenAddress);
    const tokenName = await rewardToken.name();
    console.log(`reward token verified: ${tokenName}`);

    console.log("getting contract factory for RewardDistributor...");
    const RewardDistributor = await ethers.getContractFactory(
        "RewardDistributor"
    );
    console.log("deploying RewardDistributor contract...");
    const deployed = await RewardDistributor.deploy(rewardTokenAddress);
    await deployed.waitForDeployment();
    const deployedTx = deployed.deploymentTransaction();
    const deployedAddress = await deployed.getAddress();
    console.log(
        `deployed RewardDistributor contract to: ${deployedAddress} on ${network} ...done with tx: ${deployedTx}`
    );
    cliHelper.writeHLine();

    // make output dir ...
    console.log("creating output directory...");
    const outDir = path.join(
        ".",
        "out",
        network,
        "deployment",
        "RewardDistributor",
        `${+new Date()}`
    );
    cliHelper.ensureDirExists(outDir);
    console.log("output directory created.");

    // write output result ...
    console.log("writing deployment result...");
    cliHelper.writeOutputResult(
        {
            address: deployedAddress,
            txHash: deployedTx?.hash,
        },
        outDir,
        "result.json"
    );
    console.log("deployment result written.");

    // write copied of hardhat config ...
    console.log("writing hardhat config...");
    cliHelper.writeOutputResult(
        cliHelper.JSONStringify(hre.config),
        outDir,
        "hardhat-config.json"
    );
    console.log("hardhat config written.");

    // flatten sol file to output dir ...
    console.log("flattening sol file...");
    await cliHelper.flattenSolidity2File(
        ["./contracts/RewardDistributor.sol"],
        outDir,
        "RewardDistributor.flatten.sol"
    );
    console.log("flattened sol file... done");
})();