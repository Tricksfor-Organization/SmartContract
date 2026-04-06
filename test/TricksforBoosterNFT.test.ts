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
  let minter: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let royaltyReceiver: HardhatEthersSigner;

  let MINTER_ROLE: string;
  let DEFAULT_ADMIN_ROLE: string;

  beforeEach(async function () {
    [owner, minter, alice, bob, royaltyReceiver] = await hre.ethers.getSigners();

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

    MINTER_ROLE = await nft.MINTER_ROLE();
    DEFAULT_ADMIN_ROLE = await nft.DEFAULT_ADMIN_ROLE();
  });

  // ---------------------------------------------------------------------------
  // Deployment
  // ---------------------------------------------------------------------------

  describe("Deployment", function () {
    it("sets the correct name and symbol", async function () {
      expect(await nft.name()).to.equal(NAME);
      expect(await nft.symbol()).to.equal(SYMBOL);
    });

    it("grants deployer DEFAULT_ADMIN_ROLE", async function () {
      expect(await nft.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("grants deployer MINTER_ROLE", async function () {
      expect(await nft.hasRole(MINTER_ROLE, owner.address)).to.be.true;
    });

    it("returns the correct contractURI", async function () {
      expect(await nft.contractURI()).to.equal(CONTRACT_URI);
    });

    it("returns correct royalty info for a sale", async function () {
      // First mint a token so we can query royaltyInfo
      await nft.safeMint(alice.address, 1n);
      const salePrice = hre.ethers.parseEther("1");
      const [receiver, amount] = await nft.royaltyInfo(1n, salePrice);
      expect(receiver).to.equal(royaltyReceiver.address);
      // 5% of 1 ETH = 0.05 ETH
      expect(amount).to.equal(salePrice * ROYALTY_BASIS_POINTS / 10_000n);
    });

    it("supports ERC-721, ERC-2981, ERC-165, and AccessControl interfaces", async function () {
      const ERC721_ID = "0x80ac58cd";
      const ERC2981_ID = "0x2a55205a";
      const ERC165_ID = "0x01ffc9a7";
      const ACCESS_CONTROL_ID = "0x7965db0b";
      expect(await nft.supportsInterface(ERC721_ID)).to.be.true;
      expect(await nft.supportsInterface(ERC2981_ID)).to.be.true;
      expect(await nft.supportsInterface(ERC165_ID)).to.be.true;
      expect(await nft.supportsInterface(ACCESS_CONTROL_ID)).to.be.true;
    });

    it("reverts construction with zero royalty receiver address", async function () {
      const factory = await hre.ethers.getContractFactory("TricksforBoosterNFT");
      await expect(
        factory.deploy(NAME, SYMBOL, BASE_URI, CONTRACT_URI, hre.ethers.ZeroAddress, ROYALTY_BASIS_POINTS)
      ).to.be.revertedWithCustomError(nft, "ZeroAddress");
    });
  });

  // ---------------------------------------------------------------------------
  // safeMint
  // ---------------------------------------------------------------------------

  describe("safeMint", function () {
    it("mints a token with the given ID to the specified address", async function () {
      await nft.safeMint(alice.address, 1n);
      expect(await nft.ownerOf(1n)).to.equal(alice.address);
    });

    it("mints multiple tokens with explicit IDs", async function () {
      await nft.safeMint(alice.address, 10n);
      await nft.safeMint(bob.address, 20n);
      expect(await nft.ownerOf(10n)).to.equal(alice.address);
      expect(await nft.ownerOf(20n)).to.equal(bob.address);
    });

    it("emits a Transfer event on mint", async function () {
      await expect(nft.safeMint(alice.address, 1n))
        .to.emit(nft, "Transfer")
        .withArgs(hre.ethers.ZeroAddress, alice.address, 1n);
    });

    it("reverts if called by account without MINTER_ROLE", async function () {
      await expect(nft.connect(alice).safeMint(alice.address, 1n))
        .to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount")
        .withArgs(alice.address, MINTER_ROLE);
    });

    it("reverts when paused", async function () {
      await nft.pause();
      await expect(nft.safeMint(alice.address, 1n)).to.be.revertedWithCustomError(
        nft,
        "EnforcedPause"
      );
    });

    it("resumes minting after unpause", async function () {
      await nft.pause();
      await nft.unpause();
      await nft.safeMint(alice.address, 1n);
      expect(await nft.ownerOf(1n)).to.equal(alice.address);
    });

    it("reverts if token ID already exists", async function () {
      await nft.safeMint(alice.address, 1n);
      await expect(nft.safeMint(bob.address, 1n)).to.be.revertedWithCustomError(
        nft,
        "ERC721InvalidSender"
      );
    });

    it("allows a granted MINTER_ROLE account to mint", async function () {
      await nft.grantRole(MINTER_ROLE, minter.address);
      await nft.connect(minter).safeMint(alice.address, 99n);
      expect(await nft.ownerOf(99n)).to.equal(alice.address);
    });
  });

  // ---------------------------------------------------------------------------
  // Token URI
  // ---------------------------------------------------------------------------

  describe("tokenURI", function () {
    it("returns baseURI + tokenId", async function () {
      await nft.safeMint(alice.address, 1n);
      expect(await nft.tokenURI(1n)).to.equal(`${BASE_URI}1`);
    });

    it("returns correct URI after setBaseURI", async function () {
      const newBase = "https://new.example.com/";
      await nft.safeMint(alice.address, 1n);
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
    it("updates the base URI (admin only)", async function () {
      const newBase = "https://updated.tricksfor.com/";
      await nft.setBaseURI(newBase);
      await nft.safeMint(alice.address, 1n);
      expect(await nft.tokenURI(1n)).to.equal(`${newBase}1`);
    });

    it("reverts if called by account without DEFAULT_ADMIN_ROLE", async function () {
      await expect(nft.connect(alice).setBaseURI("https://evil.com/"))
        .to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount")
        .withArgs(alice.address, DEFAULT_ADMIN_ROLE);
    });
  });

  // ---------------------------------------------------------------------------
  // setContractURI
  // ---------------------------------------------------------------------------

  describe("setContractURI", function () {
    it("updates contractURI (admin only)", async function () {
      const newURI = "https://updated.tricksfor.com/contract";
      await nft.setContractURI(newURI);
      expect(await nft.contractURI()).to.equal(newURI);
    });

    it("reverts if called by account without DEFAULT_ADMIN_ROLE", async function () {
      await expect(nft.connect(alice).setContractURI("https://evil.com/"))
        .to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount")
        .withArgs(alice.address, DEFAULT_ADMIN_ROLE);
    });
  });

  // ---------------------------------------------------------------------------
  // setRoyaltyInfo
  // ---------------------------------------------------------------------------

  describe("setRoyaltyInfo", function () {
    it("updates royalty receiver and fee (admin only)", async function () {
      const newBps = 1000n; // 10%
      await nft.safeMint(alice.address, 1n);
      await nft.setRoyaltyInfo(bob.address, newBps);
      const salePrice = hre.ethers.parseEther("1");
      const [receiver, amount] = await nft.royaltyInfo(1n, salePrice);
      expect(receiver).to.equal(bob.address);
      expect(amount).to.equal(salePrice * newBps / 10_000n);
    });

    it("reverts if called by account without DEFAULT_ADMIN_ROLE", async function () {
      await expect(nft.connect(alice).setRoyaltyInfo(alice.address, 500n))
        .to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount")
        .withArgs(alice.address, DEFAULT_ADMIN_ROLE);
    });
  });

  // ---------------------------------------------------------------------------
  // Role management
  // ---------------------------------------------------------------------------

  describe("role management", function () {
    it("admin can grant MINTER_ROLE to another account", async function () {
      await nft.grantRole(MINTER_ROLE, minter.address);
      expect(await nft.hasRole(MINTER_ROLE, minter.address)).to.be.true;
    });

    it("admin can revoke MINTER_ROLE", async function () {
      await nft.grantRole(MINTER_ROLE, minter.address);
      await nft.revokeRole(MINTER_ROLE, minter.address);
      expect(await nft.hasRole(MINTER_ROLE, minter.address)).to.be.false;
    });

    it("reverts role grant if caller lacks DEFAULT_ADMIN_ROLE", async function () {
      await expect(nft.connect(alice).grantRole(MINTER_ROLE, alice.address))
        .to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount")
        .withArgs(alice.address, DEFAULT_ADMIN_ROLE);
    });

    it("account can renounce its own MINTER_ROLE", async function () {
      await nft.grantRole(MINTER_ROLE, minter.address);
      await nft.connect(minter).renounceRole(MINTER_ROLE, minter.address);
      expect(await nft.hasRole(MINTER_ROLE, minter.address)).to.be.false;
    });
  });

  // ---------------------------------------------------------------------------
  // Pause / Unpause
  // ---------------------------------------------------------------------------

  describe("pause / unpause", function () {
    it("pauses when called by admin", async function () {
      await nft.pause();
      expect(await nft.paused()).to.be.true;
    });

    it("unpauses when called by admin", async function () {
      await nft.pause();
      await nft.unpause();
      expect(await nft.paused()).to.be.false;
    });

    it("reverts pause if called by account without DEFAULT_ADMIN_ROLE", async function () {
      await expect(nft.connect(alice).pause())
        .to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount")
        .withArgs(alice.address, DEFAULT_ADMIN_ROLE);
    });

    it("reverts unpause if called by account without DEFAULT_ADMIN_ROLE", async function () {
      await nft.pause();
      await expect(nft.connect(alice).unpause())
        .to.be.revertedWithCustomError(nft, "AccessControlUnauthorizedAccount")
        .withArgs(alice.address, DEFAULT_ADMIN_ROLE);
    });

    it("pausing does not affect token transfers", async function () {
      await nft.safeMint(alice.address, 1n);
      await nft.pause();
      // Transfer should still work even when minting is paused
      await nft.connect(alice).transferFrom(alice.address, bob.address, 1n);
      expect(await nft.ownerOf(1n)).to.equal(bob.address);
    });
  });
});
