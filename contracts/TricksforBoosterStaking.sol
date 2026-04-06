// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title TricksforBoosterStaking
/// @notice Custodial staking contract for Tricksfor Booster NFTs.
///         Players transfer their NFTs into this contract to stake them and retrieve
///         them when they unstake. Staking state and timestamps are recorded on-chain
///         via integration-critical events consumed by the Tricksfor backend indexer.
///
///         Responsibilities:
///           - Accepting NFT custody during staking
///           - Emitting TokenStaked / TokenUnstaked events for backend log processing
///           - Providing read methods (isStaked, stakedOwnerOf) consistent with event state
///
///         Not responsible for:
///           - Reward calculation or distribution
///           - Booster tier or multiplier classification
///           - Game logic or settlement
///
/// @dev    Pause gates new staking only. Unstaking is always available so players can
///         always recover their assets. emergencyWithdraw is an explicit, named, and
///         event-emitting admin path — it is not hidden.
contract TricksforBoosterStaking is Ownable, ReentrancyGuard, Pausable {
    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    /// @notice Caller does not own the token they are trying to stake.
    error NotTokenOwner();

    /// @notice Token is already staked.
    error TokenAlreadyStaked();

    /// @notice Token is not currently staked.
    error TokenNotStaked();

    /// @notice Caller is not the original staker of this token.
    error NotOriginalStaker();

    /// @notice Zero address supplied where a non-zero address is required.
    error ZeroAddress();

    // -------------------------------------------------------------------------
    // Events (integration-critical — do not rename, reorder, or re-index)
    // -------------------------------------------------------------------------

    /// @notice Emitted when a token is successfully staked.
    /// @param staker   The wallet address that owns and staked the token.
    /// @param tokenId  The staked NFT token ID.
    /// @param stakedAt Block timestamp at the moment of staking.
    event TokenStaked(address indexed staker, uint256 indexed tokenId, uint256 stakedAt);

    /// @notice Emitted when a token is successfully unstaked.
    /// @param staker     The wallet address that originally staked (and receives back) the token.
    /// @param tokenId    The unstaked NFT token ID.
    /// @param unstakedAt Block timestamp at the moment of unstaking.
    event TokenUnstaked(address indexed staker, uint256 indexed tokenId, uint256 unstakedAt);

    /// @notice Emitted when an owner-initiated emergency withdrawal occurs.
    ///         This is the only admin path that moves a user's staked NFT without their consent.
    ///         It is explicitly named, event-emitting, and documented here.
    /// @param originalStaker The wallet that originally staked the token.
    /// @param tokenId        The affected NFT token ID.
    /// @param recipient      The address that received the token.
    /// @param withdrawnAt    Block timestamp at the moment of the withdrawal.
    event EmergencyWithdrawn(
        address indexed originalStaker,
        uint256 indexed tokenId,
        address indexed recipient,
        uint256 withdrawnAt
    );

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice The ERC-721 NFT contract whose tokens this staking contract manages.
    IERC721 public immutable nftContract;

    /// @dev Maps tokenId → original staker address. Zero address means not staked.
    mapping(uint256 => address) private _stakedBy;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param nftContract_ Address of the TricksforBoosterNFT contract.
    constructor(address nftContract_) Ownable(msg.sender) {
        if (nftContract_ == address(0)) revert ZeroAddress();
        nftContract = IERC721(nftContract_);
    }

    // -------------------------------------------------------------------------
    // Staking
    // -------------------------------------------------------------------------

    /// @notice Stakes a Booster NFT. The caller must have first approved this contract
    ///         (or set approval for all) on the NFT contract.
    ///         Custody of the token is transferred to this contract.
    /// @param tokenId The token ID to stake.
    function stake(uint256 tokenId) external nonReentrant whenNotPaused {
        address caller = msg.sender;
        if (_stakedBy[tokenId] != address(0)) revert TokenAlreadyStaked();
        if (nftContract.ownerOf(tokenId) != caller) revert NotTokenOwner();

        _stakedBy[tokenId] = caller;
        nftContract.transferFrom(caller, address(this), tokenId);

        emit TokenStaked(caller, tokenId, block.timestamp);
    }

    /// @notice Unstakes a Booster NFT and returns it to the original staker.
    ///         Always available — not gated by pause — so players can always recover assets.
    /// @param tokenId The token ID to unstake.
    function unstake(uint256 tokenId) external nonReentrant {
        address originalStaker = _stakedBy[tokenId];
        if (originalStaker == address(0)) revert TokenNotStaked();
        if (originalStaker != msg.sender) revert NotOriginalStaker();

        delete _stakedBy[tokenId];
        nftContract.transferFrom(address(this), msg.sender, tokenId);

        emit TokenUnstaked(msg.sender, tokenId, block.timestamp);
    }

    // -------------------------------------------------------------------------
    // Admin — emergency withdrawal
    // -------------------------------------------------------------------------

    /// @notice Emergency withdrawal of a staked token by the contract owner.
    ///         Use only in exceptional circumstances (e.g., critical contract bug).
    ///         This is the only admin path that moves a user's staked NFT without their
    ///         direct action. It is explicitly named, emits EmergencyWithdrawn, and is
    ///         documented in this contract and the project's architecture documentation.
    /// @param tokenId   The token ID to withdraw.
    /// @param recipient The address to send the token to.
    function emergencyWithdraw(uint256 tokenId, address recipient) external onlyOwner nonReentrant {
        if (_stakedBy[tokenId] == address(0)) revert TokenNotStaked();
        if (recipient == address(0)) revert ZeroAddress();

        address originalStaker = _stakedBy[tokenId];
        delete _stakedBy[tokenId];
        nftContract.transferFrom(address(this), recipient, tokenId);

        emit EmergencyWithdrawn(originalStaker, tokenId, recipient, block.timestamp);
    }

    // -------------------------------------------------------------------------
    // Pause
    // -------------------------------------------------------------------------

    /// @notice Pauses new staking. Unstaking remains available while paused.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpauses staking.
    function unpause() external onlyOwner {
        _unpause();
    }

    // -------------------------------------------------------------------------
    // Read methods (must stay in sync with event state)
    // -------------------------------------------------------------------------

    /// @notice Returns true if the given token is currently staked.
    /// @param tokenId The token ID to query.
    function isStaked(uint256 tokenId) external view returns (bool) {
        return _stakedBy[tokenId] != address(0);
    }

    /// @notice Returns the original staker of a currently staked token.
    ///         Returns the zero address if the token is not staked.
    /// @param tokenId The token ID to query.
    function stakedOwnerOf(uint256 tokenId) external view returns (address) {
        return _stakedBy[tokenId];
    }
}
