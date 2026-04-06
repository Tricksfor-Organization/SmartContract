import { expect } from "chai";
import hre from "hardhat";
import { TricksforBoosterNFT } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TricksforBoosterNFT", function () {
  const NAME = "Tricksfor Booster";
  const SYMBOL = "TBOOST";
  const BASE_URI = "https://metadata.tricksfor.com/booster/";
  const CONTRACT_URI = "https://metadata.tricksfor.com/booster/contract";
  const ROYALTY_BASIS_POINTS = 500n; // 5%

  let nft: TricksforBoosterNFT;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let royaltyReceiver: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, alice, bob, royaltyReceiver] = await hre.ethers.getSigners();

    const factory = await hre.ethers.getContractFactory("TricksforBoosterNFT");
    nft = (await factory.deploy(
      NAME,
      SYMBOL,
      BASE_URI,
      CONTRACT_URI,
      royaltyReceiver.address,
      ROYALTY_BASIS_POINTS
    )) as TricksforBoosterNFT;
    await nft.waitForDeployment();
  });

  // ---------------------------------------------------------------------------
  // Deployment
  // ---------------------------------------------------------------------------

  describe("Deployment", function () {
    it("sets the correct name and symbol", async function () {
      expect(await nft.name()).to.equal(NAME);
      expect(await nft.symbol()).to.equal(SYMBOL);
    });

    it("sets the deployer as owner", async function () {
      expect(await nft.owner()).to.equal(owner.address);
    });

    it("returns the correct contractURI", async function () {
      expect(await nft.contractURI()).to.equal(CONTRACT_URI);
    });

    it("returns correct royalty info for a sale", async function () {
      // First mint a token so we can query royaltyInfo
      await nft.mint(alice.address);
      const salePrice = hre.ethers.parseEther("1");
      const [receiver, amount] = await nft.royaltyInfo(1n, salePrice);
      expect(receiver).to.equal(royaltyReceiver.address);
      // 5% of 1 ETH = 0.05 ETH
      expect(amount).to.equal(salePrice * ROYALTY_BASIS_POINTS / 10_000n);
    });

    it("supports ERC-721, ERC-2981, and ERC-165 interfaces", async function () {
      const ERC721_ID = "0x80ac58cd";
      const ERC2981_ID = "0x2a55205a";
      const ERC165_ID = "0x01ffc9a7";
      expect(await nft.supportsInterface(ERC721_ID)).to.be.true;
      expect(await nft.supportsInterface(ERC2981_ID)).to.be.true;
      expect(await nft.supportsInterface(ERC165_ID)).to.be.true;
    });
  });

  // ---------------------------------------------------------------------------
  // Minting
  // ---------------------------------------------------------------------------

  describe("mint", function () {
    it("mints the first token with id 1 to the given address", async function () {
      await nft.mint(alice.address);
      expect(await nft.ownerOf(1n)).to.equal(alice.address);
    });

    it("mints sequential token IDs", async function () {
      await nft.mint(alice.address);
      await nft.mint(bob.address);
      expect(await nft.ownerOf(1n)).to.equal(alice.address);
      expect(await nft.ownerOf(2n)).to.equal(bob.address);
    });

    it("emits a Transfer event on mint", async function () {
      await expect(nft.mint(alice.address))
        .to.emit(nft, "Transfer")
        .withArgs(hre.ethers.ZeroAddress, alice.address, 1n);
    });

    it("reverts if called by non-owner", async function () {
      await expect(nft.connect(alice).mint(alice.address))
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });

    it("reverts when paused", async function () {
      await nft.pause();
      await expect(nft.mint(alice.address)).to.be.revertedWithCustomError(
        nft,
        "EnforcedPause"
      );
    });

    it("resumes minting after unpause", async function () {
      await nft.pause();
      await nft.unpause();
      await nft.mint(alice.address);
      expect(await nft.ownerOf(1n)).to.equal(alice.address);
    });
  });

  // ---------------------------------------------------------------------------
  // Token URI
  // ---------------------------------------------------------------------------

  describe("tokenURI", function () {
    it("returns baseURI + tokenId", async function () {
      await nft.mint(alice.address);
      expect(await nft.tokenURI(1n)).to.equal(`${BASE_URI}1`);
    });

    it("returns correct URI after setBaseURI", async function () {
      const newBase = "https://new.example.com/";
      await nft.mint(alice.address);
      await nft.setBaseURI(newBase);
      expect(await nft.tokenURI(1n)).to.equal(`${newBase}1`);
    });

    it("reverts for non-existent token", async function () {
      await expect(nft.tokenURI(999n)).to.be.revertedWithCustomError(
        nft,
        "ERC721NonexistentToken"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // setBaseURI
  // ---------------------------------------------------------------------------

  describe("setBaseURI", function () {
    it("updates the base URI (owner only)", async function () {
      const newBase = "https://updated.tricksfor.com/";
      await nft.setBaseURI(newBase);
      await nft.mint(alice.address);
      expect(await nft.tokenURI(1n)).to.equal(`${newBase}1`);
    });

    it("reverts if called by non-owner", async function () {
      await expect(nft.connect(alice).setBaseURI("https://evil.com/"))
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });
  });

  // ---------------------------------------------------------------------------
  // setContractURI
  // ---------------------------------------------------------------------------

  describe("setContractURI", function () {
    it("updates contractURI (owner only)", async function () {
      const newURI = "https://updated.tricksfor.com/contract";
      await nft.setContractURI(newURI);
      expect(await nft.contractURI()).to.equal(newURI);
    });

    it("reverts if called by non-owner", async function () {
      await expect(nft.connect(alice).setContractURI("https://evil.com/"))
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });
  });

  // ---------------------------------------------------------------------------
  // setRoyaltyInfo
  // ---------------------------------------------------------------------------

  describe("setRoyaltyInfo", function () {
    it("updates royalty receiver and fee (owner only)", async function () {
      const newBps = 1000n; // 10%
      await nft.mint(alice.address);
      await nft.setRoyaltyInfo(bob.address, newBps);
      const salePrice = hre.ethers.parseEther("1");
      const [receiver, amount] = await nft.royaltyInfo(1n, salePrice);
      expect(receiver).to.equal(bob.address);
      expect(amount).to.equal(salePrice * newBps / 10_000n);
    });

    it("reverts if called by non-owner", async function () {
      await expect(nft.connect(alice).setRoyaltyInfo(alice.address, 500n))
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });
  });

  // ---------------------------------------------------------------------------
  // Pause / Unpause
  // ---------------------------------------------------------------------------

  describe("pause / unpause", function () {
    it("pauses when called by owner", async function () {
      await nft.pause();
      expect(await nft.paused()).to.be.true;
    });

    it("unpauses when called by owner", async function () {
      await nft.pause();
      await nft.unpause();
      expect(await nft.paused()).to.be.false;
    });

    it("reverts pause if called by non-owner", async function () {
      await expect(nft.connect(alice).pause())
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });

    it("reverts unpause if called by non-owner", async function () {
      await nft.pause();
      await expect(nft.connect(alice).unpause())
        .to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });

    it("pausing does not affect token transfers", async function () {
      await nft.mint(alice.address);
      await nft.pause();
      // Transfer should still work even when minting is paused
      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);
      expect(await nft.ownerOf(1n)).to.equal(bob.address);
    });
  });
});
