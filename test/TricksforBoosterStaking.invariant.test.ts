import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("TricksforBoosterStaking state-machine invariants", function () {
  it("preserves custody, staking records, and unique wallet lists across mixed operations", async function () {
    this.timeout(120_000);

    const [admin, ...participants] = (await ethers.getSigners()).slice(0, 5);
    const nft = await ethers.deployContract("TricksforBoosterNFT", [
      "Tricksfor Booster Invariant",
      "TFB",
      "https://metadata.example/",
      "https://metadata.example/contract.json",
      admin.address,
      500n,
      admin.address,
      admin.address,
      0n,
    ]);
    await nft.waitForDeployment();

    const staking = await ethers.deployContract("TricksforBoosterStaking", [
      await nft.getAddress(),
      admin.address,
    ]);
    await staking.waitForDeployment();
    const stakingAddress = await staking.getAddress();

    const signerByAddress = new Map(
      participants.map((signer) => [signer.address.toLowerCase(), signer])
    );
    const states = new Map<bigint, { holder: string; staker: string | null }>();
    const tokenIds = Array.from({ length: 12 }, (_, index) => BigInt(index + 1));

    for (let index = 0; index < tokenIds.length; index++) {
      const recipient = participants[index % participants.length];
      await nft.safeMint(recipient.address, tokenIds[index]);
      states.set(tokenIds[index], { holder: recipient.address, staker: null });
    }

    let randomState = 0x5eed1234n;
    const nextRandom = (maximum: number) => {
      randomState = (1_103_515_245n * randomState + 12_345n) % 2_147_483_648n;
      return Number(randomState % BigInt(maximum));
    };

    const assertInvariants = async () => {
      const listed = new Map<string, bigint[]>();
      for (const participant of participants) {
        listed.set(
          participant.address.toLowerCase(),
          [...await staking.getWalletStakedTokens(participant.address)]
        );
      }

      const allListed = [...listed.values()].flat();
      expect(new Set(allListed.map(String)).size).to.equal(allListed.length);

      for (const tokenId of tokenIds) {
        const expected = states.get(tokenId)!;
        const tracked = expected.staker !== null;
        expect(await staking.isStaked(tokenId)).to.equal(tracked);
        expect(await staking.stakedOwnerOf(tokenId)).to.equal(
          expected.staker ?? ethers.ZeroAddress
        );
        expect(await nft.ownerOf(tokenId)).to.equal(expected.holder);

        for (const participant of participants) {
          const walletTokens = listed.get(participant.address.toLowerCase())!;
          const shouldContain = expected.staker?.toLowerCase() === participant.address.toLowerCase();
          expect(walletTokens.includes(tokenId)).to.equal(shouldContain);
        }
      }
    };

    for (let step = 0; step < 100; step++) {
      const tokenId = tokenIds[nextRandom(tokenIds.length)];
      const state = states.get(tokenId)!;
      const operation = nextRandom(6);

      if ((operation === 0 || operation === 1) && state.staker === null) {
        const holder = signerByAddress.get(state.holder.toLowerCase())!;
        if (operation === 0) {
          await nft.connect(holder).approve(stakingAddress, tokenId);
          await staking.connect(holder).stake(tokenId);
        } else {
          await nft.connect(holder)["safeTransferFrom(address,address,uint256)"](
            holder.address,
            stakingAddress,
            tokenId
          );
        }
        state.staker = holder.address;
        state.holder = stakingAddress;
      } else if (operation === 2 && state.staker !== null) {
        const staker = signerByAddress.get(state.staker.toLowerCase())!;
        await staking.connect(staker).unstake(tokenId);
        state.holder = staker.address;
        state.staker = null;
      } else if (operation === 3 && state.staker !== null) {
        const originalStaker = state.staker;
        await staking.emergencyWithdraw(tokenId, originalStaker);
        state.holder = originalStaker;
        state.staker = null;
      } else if (operation === 4 && state.staker === null) {
        const holder = signerByAddress.get(state.holder.toLowerCase())!;
        const recipient = participants[nextRandom(participants.length)];
        if (recipient.address !== holder.address) {
          await nft.connect(holder).transferFrom(holder.address, recipient.address, tokenId);
          state.holder = recipient.address;
        }
      } else if (operation === 5 && state.staker === null) {
        const holder = signerByAddress.get(state.holder.toLowerCase())!;
        await staking.pause();
        await nft.connect(holder).approve(stakingAddress, tokenId);
        await expect(staking.connect(holder).stake(tokenId))
          .to.be.revertedWithCustomError(staking, "EnforcedPause");
        await staking.unpause();
      }

      await assertInvariants();
    }
  });
});
