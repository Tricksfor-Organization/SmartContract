// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IReentrantStakingTarget {
    function stake(uint256 tokenId) external;
}

/// @dev Test-only NFT double that calls stake again from transferFrom.
contract ReentrantERC721 {
    mapping(uint256 tokenId => address owner) private _owners;
    IReentrantStakingTarget public immutable staking;
    bool public attackEnabled;

    constructor(address staking_) {
        staking = IReentrantStakingTarget(staking_);
    }

    function mint(address to, uint256 tokenId) external {
        _owners[tokenId] = to;
    }

    function enableAttack() external {
        attackEnabled = true;
        _owners[999] = address(this);
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return _owners[tokenId];
    }

    function transferFrom(address from, address to, uint256 tokenId) external {
        require(_owners[tokenId] == from, "wrong owner");
        if (attackEnabled) {
            attackEnabled = false;
            staking.stake(999);
        }
        _owners[tokenId] = to;
    }
}
