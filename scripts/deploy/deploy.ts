import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USDC_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;

  console.log(`Deploying on chain ${chainId} with ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);

  const usdc = chainId === 8453n ? USDC_BASE_MAINNET : USDC_BASE_SEPOLIA;
  console.log(`Using USDC: ${usdc}`);

  // ── 1. Deploy RWARegistry ────────────────────────────────────────────────
  console.log("\n1. Deploying RWARegistry…");
  const Registry = await ethers.getContractFactory("RWARegistry");
  const registry = await Registry.deploy(deployer.address);
  await registry.waitForDeployment();
  console.log(`   RWARegistry: ${await registry.getAddress()}`);

  // ── 2. Deploy ProtocolTreasury ────────────────────────────────────────────
  console.log("2. Deploying ProtocolTreasury…");
  const Treasury = await ethers.getContractFactory("ProtocolTreasury");
  const treasury = await Treasury.deploy(await registry.getAddress(), usdc);
  await treasury.waitForDeployment();
  console.log(`   ProtocolTreasury: ${await treasury.getAddress()}`);

  // ── 3. Deploy ProjectFactory ──────────────────────────────────────────────
  console.log("3. Deploying ProjectFactory…");
  const Factory = await ethers.getContractFactory("ProjectFactory");
  const factory = await Factory.deploy(await registry.getAddress(), usdc);
  await factory.waitForDeployment();
  console.log(`   ProjectFactory: ${await factory.getAddress()}`);

  // ── 4. Wire Registry ──────────────────────────────────────────────────────
  console.log("4. Wiring Registry…");
  await (await registry.setFactory(await factory.getAddress())).wait();
  await (await registry.setTreasury(await treasury.getAddress())).wait();
  console.log("   Done.");

  // ── 5. Save addresses ─────────────────────────────────────────────────────
  const addresses = {
    chainId:          chainId.toString(),
    registry:         await registry.getAddress(),
    protocolTreasury: await treasury.getAddress(),
    factory:          await factory.getAddress(),
    usdc,
    deployer:         deployer.address,
    timestamp:        new Date().toISOString(),
  };

  const outPath = join(__dirname, `../../deployments/${chainId}.json`);
  writeFileSync(outPath, JSON.stringify(addresses, null, 2));
  console.log(`\nAddresses saved to deployments/${chainId}.json`);
  console.log(addresses);

  // ── 6. .env hint ─────────────────────────────────────────────────────────
  console.log("\nAdd to frontend/.env.local:");
  console.log(`NEXT_PUBLIC_REGISTRY_ADDRESS=${addresses.registry}`);
  console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${addresses.factory}`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${usdc}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
