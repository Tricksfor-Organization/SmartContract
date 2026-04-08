import { expect } from "chai";
import hre from "hardhat";
import { TricksforBoosterNFT, TricksforBoosterStaking } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TricksforBoosterStaking", function () {
  let nft: TricksforBoosterNFT;
  let staking: TricksforBoosterStaking;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  const TOKEN_1 = 1n;
  const TOKEN_2 = 2n;

  beforeEach(async function () {
    [owner, alice, bob] = await hre.ethers.getSigners();

    // Deploy NFT contract
    const nftFactory = await hre.ethers.getContractFactory("TricksforBoosterNFT");
    nft = (await nftFactory.deploy(
      "Tricksfor Booster",
      "TBOOST",
      "https://metadata.tricksfor.com/booster/",
      "https://metadata.tricksfor.com/booster/contract",
      owner.address,
      500n
    )) as TricksforBoosterNFT;
    await nft.waitForDeployment();

    // Deploy staking contract with reference to the NFT contract
    const stakingFactory = await hre.ethers.getContractFactory("TricksforBoosterStaking");
    staking = (await stakingFactory.deploy(
      await nft.getAddress()
    )) as TricksforBoosterStaking;
    await staking.waitForDeployment();

    // Mint tokens for tests
    await nft.safeMint(alice.address, 1n); // token 1
    await nft.safeMint(alice.address, 2n); // token 2
    await nft.safeMint(bob.address, 3n);   // token 3
  });

  // ---------------------------------------------------------------------------
  // Deployment
  // ---------------------------------------------------------------------------

  describe("Deployment", function () {
    it("stores the NFT contract address", async function () {
      expect(await staking.nftContract()).to.equal(await nft.getAddress());
    });

    it("sets the deployer as owner", async function () {
      expect(await staking.owner()).to.equal(owner.address);
    });

    it("reverts if constructed with zero address", async function () {
      const factory = await hre.ethers.getContractFactory("TricksforBoosterStaking");
      await expect(factory.deploy(hre.ethers.ZeroAddress)).to.be.revertedWithCustomError(
        staking,
        "ZeroAddress"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // stake
  // ---------------------------------------------------------------------------

  describe("stake", function () {
    it("transfers custody to the staking contract", async function () {
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await staking.connect(alice).stake(TOKEN_1);
      expect(await nft.ownerOf(TOKEN_1)).to.equal(await staking.getAddress());
    });

    it("records the original staker", async function () {
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await staking.connect(alice).stake(TOKEN_1);
      expect(await staking.stakedOwnerOf(TOKEN_1)).to.equal(alice.address);
    });

    it("isStaked returns true after staking", async function () {
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await staking.connect(alice).stake(TOKEN_1);
      expect(await staking.isStaked(TOKEN_1)).to.be.true;
    });

    it("emits TokenStaked with correct indexed fields and timestamp", async function () {
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);

      const tx = await staking.connect(alice).stake(TOKEN_1);
      const receipt = await tx.wait();
      const block = await hre.ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(staking, "TokenStaked")
        .withArgs(alice.address, TOKEN_1, block!.timestamp);
    });

    it("allows one wallet to stake multiple tokens", async function () {
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_2);
      await staking.connect(alice).stake(TOKEN_1);
      await staking.connect(alice).stake(TOKEN_2);
      expect(await staking.isStaked(TOKEN_1)).to.be.true;
      expect(await staking.isStaked(TOKEN_2)).to.be.true;
      expect(await staking.stakedOwnerOf(TOKEN_1)).to.equal(alice.address);
      expect(await staking.stakedOwnerOf(TOKEN_2)).to.equal(alice.address);
    });

    it("reverts if caller does not own the token", async function () {
      // bob tries to stake alice's token
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await expect(staking.connect(bob).stake(TOKEN_1)).to.be.revertedWithCustomError(
        staking,
        "NotTokenOwner"
      );
    });

    it("reverts if staking contract is not approved (no approval given)", async function () {
      // alice owns TOKEN_1 but has not approved the staking contract
      await expect(staking.connect(alice).stake(TOKEN_1)).to.be.revertedWithCustomError(
        nft,
        "ERC721InsufficientApproval"
      );
    });

    it("reverts if token is already staked", async function () {
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await staking.connect(alice).stake(TOKEN_1);
      await expect(staking.connect(alice).stake(TOKEN_1)).to.be.revertedWithCustomError(
        staking,
        "TokenAlreadyStaked"
      );
    });

    it("reverts when the contract is paused", async function () {
      await staking.pause();
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await expect(staking.connect(alice).stake(TOKEN_1)).to.be.revertedWithCustomError(
        staking,
        "EnforcedPause"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // unstake
  // ---------------------------------------------------------------------------

  describe("unstake", function () {
    beforeEach(async function () {
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await staking.connect(alice).stake(TOKEN_1);
    });

    it("returns the token to the original staker", async function () {
      await staking.connect(alice).unstake(TOKEN_1);
      expect(await nft.ownerOf(TOKEN_1)).to.equal(alice.address);
    });

    it("clears the staking record", async function () {
      await staking.connect(alice).unstake(TOKEN_1);
      expect(await staking.isStaked(TOKEN_1)).to.be.false;
      expect(await staking.stakedOwnerOf(TOKEN_1)).to.equal(hre.ethers.ZeroAddress);
    });

    it("emits TokenUnstaked with correct indexed fields and timestamp", async function () {
      const tx = await staking.connect(alice).unstake(TOKEN_1);
      const receipt = await tx.wait();
      const block = await hre.ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(staking, "TokenUnstaked")
        .withArgs(alice.address, TOKEN_1, block!.timestamp);
    });

    it("reverts if token is not staked", async function () {
      await expect(staking.connect(alice).unstake(TOKEN_2)).to.be.revertedWithCustomError(
        staking,
        "TokenNotStaked"
      );
    });

    it("reverts if caller is not the original staker", async function () {
      await expect(staking.connect(bob).unstake(TOKEN_1)).to.be.revertedWithCustomError(
        staking,
        "NotOriginalStaker"
      );
    });

    it("is available even when the contract is paused (players can always recover assets)", async function () {
      await staking.pause();
      await staking.connect(alice).unstake(TOKEN_1);
      expect(await staking.isStaked(TOKEN_1)).to.be.false;
      expect(await nft.ownerOf(TOKEN_1)).to.equal(alice.address);
    });

    it("allows re-staking after unstake", async function () {
      await staking.connect(alice).unstake(TOKEN_1);
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await staking.connect(alice).stake(TOKEN_1);
      expect(await staking.isStaked(TOKEN_1)).to.be.true;
    });
  });

  // ---------------------------------------------------------------------------
  // emergencyWithdraw
  // ---------------------------------------------------------------------------

  describe("emergencyWithdraw", function () {
    beforeEach(async function () {
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await staking.connect(alice).stake(TOKEN_1);
    });

    it("transfers the token to the specified recipient", async function () {
      await staking.emergencyWithdraw(TOKEN_1, bob.address);
      expect(await nft.ownerOf(TOKEN_1)).to.equal(bob.address);
    });

    it("clears the staking record", async function () {
      await staking.emergencyWithdraw(TOKEN_1, bob.address);
      expect(await staking.isStaked(TOKEN_1)).to.be.false;
    });

    it("emits EmergencyWithdrawn with correct indexed fields and timestamp", async function () {
      const tx = await staking.emergencyWithdraw(TOKEN_1, bob.address);
      const receipt = await tx.wait();
      const block = await hre.ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(staking, "EmergencyWithdrawn")
        .withArgs(alice.address, TOKEN_1, bob.address, block!.timestamp);
    });

    it("reverts if token is not staked", async function () {
      await expect(staking.emergencyWithdraw(TOKEN_2, bob.address)).to.be.revertedWithCustomError(
        staking,
        "TokenNotStaked"
      );
    });

    it("reverts if recipient is the zero address", async function () {
      await expect(
        staking.emergencyWithdraw(TOKEN_1, hre.ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(staking, "ZeroAddress");
    });

    it("reverts if called by non-owner", async function () {
      await expect(staking.connect(alice).emergencyWithdraw(TOKEN_1, bob.address))
        .to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });
  });

  // ---------------------------------------------------------------------------
  // Read methods — state/event consistency
  // ---------------------------------------------------------------------------

  describe("isStaked / stakedOwnerOf", function () {
    it("isStaked returns false for unstaked token", async function () {
      expect(await staking.isStaked(TOKEN_1)).to.be.false;
    });

    it("stakedOwnerOf returns zero address for unstaked token", async function () {
      expect(await staking.stakedOwnerOf(TOKEN_1)).to.equal(hre.ethers.ZeroAddress);
    });

    it("isStaked returns true and stakedOwnerOf returns staker after staking", async function () {
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await staking.connect(alice).stake(TOKEN_1);
      expect(await staking.isStaked(TOKEN_1)).to.be.true;
      expect(await staking.stakedOwnerOf(TOKEN_1)).to.equal(alice.address);
    });

    it("isStaked returns false and stakedOwnerOf returns zero address after unstaking", async function () {
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await staking.connect(alice).stake(TOKEN_1);
      await staking.connect(alice).unstake(TOKEN_1);
      expect(await staking.isStaked(TOKEN_1)).to.be.false;
      expect(await staking.stakedOwnerOf(TOKEN_1)).to.equal(hre.ethers.ZeroAddress);
    });
  });

  // ---------------------------------------------------------------------------
  // stakedAtOf
  // ---------------------------------------------------------------------------

  describe("stakedAtOf", function () {
    it("returns zero for a token that is not staked", async function () {
      expect(await staking.stakedAtOf(TOKEN_1)).to.equal(0n);
    });

    it("returns the block timestamp at which the token was staked", async function () {
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      const tx = await staking.connect(alice).stake(TOKEN_1);
      const receipt = await tx.wait();
      const block = await hre.ethers.provider.getBlock(receipt!.blockNumber);

      expect(await staking.stakedAtOf(TOKEN_1)).to.equal(block!.timestamp);
    });

    it("returns zero after the token is unstaked", async function () {
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await staking.connect(alice).stake(TOKEN_1);
      await staking.connect(alice).unstake(TOKEN_1);
      expect(await staking.stakedAtOf(TOKEN_1)).to.equal(0n);
    });

    it("reflects the new timestamp when re-staked", async function () {
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await staking.connect(alice).stake(TOKEN_1);
      await staking.connect(alice).unstake(TOKEN_1);

      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      const tx2 = await staking.connect(alice).stake(TOKEN_1);
      const receipt2 = await tx2.wait();
      const block2 = await hre.ethers.provider.getBlock(receipt2!.blockNumber);

      expect(await staking.stakedAtOf(TOKEN_1)).to.equal(block2!.timestamp);
    });
  });

  // ---------------------------------------------------------------------------
  // getWalletStakedTokens
  // ---------------------------------------------------------------------------

  describe("getWalletStakedTokens", function () {
    it("returns an empty array for a wallet with no staked tokens", async function () {
      const tokens = await staking.getWalletStakedTokens(alice.address);
      expect(tokens).to.deep.equal([]);
    });

    it("returns the staked token after one stake", async function () {
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await staking.connect(alice).stake(TOKEN_1);
      const tokens = await staking.getWalletStakedTokens(alice.address);
      expect(tokens.map((t) => t)).to.deep.equal([TOKEN_1]);
    });

    it("returns all tokens staked by a wallet", async function () {
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_2);
      await staking.connect(alice).stake(TOKEN_1);
      await staking.connect(alice).stake(TOKEN_2);
      const tokens = await staking.getWalletStakedTokens(alice.address);
      expect(tokens.map((t) => t).sort()).to.deep.equal([TOKEN_1, TOKEN_2].sort());
    });

    it("removes the token from the wallet list after unstake", async function () {
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_2);
      await staking.connect(alice).stake(TOKEN_1);
      await staking.connect(alice).stake(TOKEN_2);
      await staking.connect(alice).unstake(TOKEN_1);
      const tokens = await staking.getWalletStakedTokens(alice.address);
      expect(tokens.map((t) => t)).to.deep.equal([TOKEN_2]);
    });

    it("handles unstaking the last token in the list correctly", async function () {
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await staking.connect(alice).stake(TOKEN_1);
      await staking.connect(alice).unstake(TOKEN_1);
      const tokens = await staking.getWalletStakedTokens(alice.address);
      expect(tokens).to.deep.equal([]);
    });

    it("removes the token after an emergency withdrawal", async function () {
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await staking.connect(alice).stake(TOKEN_1);
      await staking.emergencyWithdraw(TOKEN_1, bob.address);
      const tokens = await staking.getWalletStakedTokens(alice.address);
      expect(tokens).to.deep.equal([]);
    });

    it("isolates staked tokens per wallet", async function () {
      const TOKEN_3 = 3n;
      await nft.connect(alice).approve(await staking.getAddress(), TOKEN_1);
      await nft.connect(bob).approve(await staking.getAddress(), TOKEN_3);
      await staking.connect(alice).stake(TOKEN_1);
      await staking.connect(bob).stake(TOKEN_3);
      const aliceTokens = await staking.getWalletStakedTokens(alice.address);
      const bobTokens = await staking.getWalletStakedTokens(bob.address);
      expect(aliceTokens.map((t) => t)).to.deep.equal([TOKEN_1]);
      expect(bobTokens.map((t) => t)).to.deep.equal([TOKEN_3]);
    });
  });

  // ---------------------------------------------------------------------------
  // onERC721Received — IERC721Receiver support
  // ---------------------------------------------------------------------------

  describe("onERC721Received (safeTransferFrom staking path)", function () {
    it("accepts a safeTransferFrom from the NFT contract and records the staker", async function () {
      await nft.connect(alice)["safeTransferFrom(address,address,uint256)"](
        alice.address,
        await staking.getAddress(),
        TOKEN_1
      );
      expect(await staking.isStaked(TOKEN_1)).to.be.true;
      expect(await staking.stakedOwnerOf(TOKEN_1)).to.equal(alice.address);
      expect(await nft.ownerOf(TOKEN_1)).to.equal(await staking.getAddress());
    });

    it("emits TokenStaked when receiving via safeTransferFrom", async function () {
      const tx = await nft.connect(alice)["safeTransferFrom(address,address,uint256)"](
        alice.address,
        await staking.getAddress(),
        TOKEN_1
      );
      const receipt = await tx.wait();
      const block = await hre.ethers.provider.getBlock(receipt!.blockNumber);

      await expect(tx)
        .to.emit(staking, "TokenStaked")
        .withArgs(alice.address, TOKEN_1, block!.timestamp);
    });

    it("reverts safeTransferFrom from an unsupported NFT contract", async function () {
      // Deploy a second, unrelated NFT collection
      const nftFactory = await hre.ethers.getContractFactory("TricksforBoosterNFT");
      const otherNft = await nftFactory.deploy(
        "Other NFT", "OTHER",
        "https://other.example.com/",
        "https://other.example.com/contract",
        owner.address,
        500n
      );
      await otherNft.waitForDeployment();
      await otherNft.safeMint(alice.address, TOKEN_1);

      await expect(
        otherNft.connect(alice)["safeTransferFrom(address,address,uint256)"](
          alice.address,
          await staking.getAddress(),
          TOKEN_1
        )
      ).to.be.revertedWithCustomError(staking, "UnsupportedNFTContract");
    });

    it("reverts safeTransferFrom when contract is paused", async function () {
      await staking.pause();
      await expect(
        nft.connect(alice)["safeTransferFrom(address,address,uint256)"](
          alice.address,
          await staking.getAddress(),
          TOKEN_1
        )
      ).to.be.revertedWithCustomError(staking, "EnforcedPause");
    });

    it("unstake works for a token staked via safeTransferFrom", async function () {
      await nft.connect(alice)["safeTransferFrom(address,address,uint256)"](
        alice.address,
        await staking.getAddress(),
        TOKEN_1
      );
      await staking.connect(alice).unstake(TOKEN_1);
      expect(await staking.isStaked(TOKEN_1)).to.be.false;
      expect(await nft.ownerOf(TOKEN_1)).to.equal(alice.address);
    });

    it("reverts when from is the zero address (mint directly to staking contract)", async function () {
      // Minting directly to the staking contract via safeMint triggers onERC721Received
      // with from == address(0). This must revert to prevent a token being held in custody
      // without staking state (which would trap it with no unstake path).
      await expect(
        nft.safeMint(await staking.getAddress(), 99n)
      ).to.be.revertedWithCustomError(staking, "ZeroAddress");
    });
  });

  // ---------------------------------------------------------------------------
  // Pause / Unpause
  // ---------------------------------------------------------------------------

  describe("pause / unpause", function () {
    it("pauses when called by owner", async function () {
      await staking.pause();
      expect(await staking.paused()).to.be.true;
    });

    it("unpauses when called by owner", async function () {
      await staking.pause();
      await staking.unpause();
      expect(await staking.paused()).to.be.false;
    });

    it("reverts pause if called by non-owner", async function () {
      await expect(staking.connect(alice).pause())
        .to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });

    it("reverts unpause if called by non-owner", async function () {
      await staking.pause();
      await expect(staking.connect(alice).unpause())
        .to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });
  });
});
