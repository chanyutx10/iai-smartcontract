import { Command } from "commander";

import cliHelper from "./cli-helper";

import { ethers } from "hardhat";
import * as hre from "hardhat";
import * as path from "path";

const program = new Command("deploy-iai-token")
    .description("deploy iAI token")
    // .requiredOption(
    //     "--input [value]",
    //     "path to input file for example: cmd-input/deploy-moonmedal-testnet"
    // )
    .option("--network [value]", "specific network")
    .parse(process.argv);

interface Input {}

(async (): Promise<void> => {
    const { input: inputFilePath, network } = program.opts();

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

    const adminWallet = await hre.ethers.provider.getSigner();
    const adminWalletAddress = await adminWallet.getAddress();

    const IAIToken = await ethers.getContractFactory("IAIToken");
    const deployed = await IAIToken.deploy(adminWalletAddress);
    await deployed.waitForDeployment();
    const deployedTx = deployed.deploymentTransaction();
    const deployedAddress = await deployed.getAddress();
    console.log(
        `deployed iAI Token contract to: ${deployedAddress} on ${network} ...done with tx: ${deployedTx}`
    );
    cliHelper.writeHLine();

    // make output dir ...
    const outDir = path.join(
        ".",
        "out",
        network,
        "deployment",
        "iAIToken",
        `${+new Date()}`
    );
    cliHelper.ensureDirExists(outDir);

    // write output result ...
    cliHelper.writeOutputResult(
        {
            address: deployedAddress,
            txHash: deployedTx?.hash,
        },
        outDir,
        "result.json"
    );

    // write copied of hardhat config ...
    cliHelper.writeOutputResult(
        cliHelper.JSONStringify(hre.config),
        outDir,
        "hardhat-config.json"
    );

    // flatten sol file to output dir ...
    console.log("flattening sol file...");
    await cliHelper.flattenSolidity2File(
        ["./contracts/IAIToken.sol"],
        outDir,
        "USDT.flatten.sol"
    );
    console.log("flattened sol file... done");
})();