import hre from "hardhat";

async function main(): Promise<void> {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);

  // ---------------------------------------------------------------------------
  // Deploy TricksforBoosterNFT
  // ---------------------------------------------------------------------------
  const nftFactory = await hre.ethers.getContractFactory("TricksforBoosterNFT");
  const nft = await nftFactory.deploy(
    "Tricksfor Booster",           // name
    "TBOOST",                      // symbol
    "https://metadata.tricksfor.com/booster/",   // baseURI
    "https://metadata.tricksfor.com/booster/contract", // contractURI
    deployer.address,              // royalty receiver
    500n                           // 5% royalty (500 basis points)
  );
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log(`TricksforBoosterNFT deployed to: ${nftAddress}`);
  console.log(`  Deployer granted DEFAULT_ADMIN_ROLE and MINTER_ROLE`);

  // ---------------------------------------------------------------------------
  // Deploy TricksforBoosterStaking
  // ---------------------------------------------------------------------------
  const stakingFactory = await hre.ethers.getContractFactory("TricksforBoosterStaking");
  const staking = await stakingFactory.deploy(nftAddress);
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log(`TricksforBoosterStaking deployed to: ${stakingAddress}`);

  console.log("\nDeployment complete.");
  console.log(`  NFT:     ${nftAddress}`);
  console.log(`  Staking: ${stakingAddress}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
