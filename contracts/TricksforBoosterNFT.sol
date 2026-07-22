// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title TricksforBoosterNFT
/// @notice ERC-721 Enumerable NFT collection for Tricksfor Booster items.
///         OpenSea-compatible: supports tokenURI, contractURI, and ERC-2981 royalties.
///         Minting is role-gated (MINTER_ROLE) and can be paused by the default admin.
/// @dev Does not include staking logic — staking is handled by TricksforBoosterStaking.
contract TricksforBoosterNFT is
    ERC721,
    ERC721Enumerable,
    ERC2981,
    AccessControlDefaultAdminRules,
    Pausable
{
    // -------------------------------------------------------------------------
    // Roles
    // -------------------------------------------------------------------------

    /// @notice Role that authorizes an account to call safeMint.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    /// @notice Zero address supplied where a non-zero address is required.
    error ZeroAddress();

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event BaseURIUpdated(string previousURI, string newURI);
    event ContractURIUpdated(string previousURI, string newURI);
    event DefaultRoyaltyUpdated(address indexed receiver, uint96 feeBasisPoints);

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    string private _baseTokenURI;
    string private _contractMetadataURI;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param name_                  ERC-721 collection name
    /// @param symbol_                ERC-721 collection symbol
    /// @param baseURI_               Base URI for token metadata (appended with tokenId)
    /// @param contractMetadataURI_   URI for OpenSea collection-level metadata
    /// @param royaltyReceiver_       Address that receives royalty payments
    /// @param royaltyFeeBasisPoints_ Royalty fee in basis points (10 000 = 100%)
    /// @param initialAdmin_          Initial default administrator
    /// @param initialMinter_         Initial account authorized to mint
    /// @param defaultAdminDelay_     Delay in seconds for default-admin transfers
    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        string memory contractMetadataURI_,
        address royaltyReceiver_,
        uint96 royaltyFeeBasisPoints_,
        address initialAdmin_,
        address initialMinter_,
        uint48 defaultAdminDelay_
    ) ERC721(name_, symbol_) AccessControlDefaultAdminRules(defaultAdminDelay_, initialAdmin_) {
        if (royaltyReceiver_ == address(0) || initialAdmin_ == address(0) || initialMinter_ == address(0)) {
            revert ZeroAddress();
        }
        _baseTokenURI = baseURI_;
        _contractMetadataURI = contractMetadataURI_;
        _setDefaultRoyalty(royaltyReceiver_, royaltyFeeBasisPoints_);
        _grantRole(MINTER_ROLE, initialMinter_);
    }

    // -------------------------------------------------------------------------
    // Minting
    // -------------------------------------------------------------------------

    /// @notice Mints a token with the given ID to the specified address.
    ///         The caller must hold MINTER_ROLE. Reverts when paused.
    /// @param to      Recipient address for the minted token.
    /// @param tokenId Token ID to mint. Must not already exist.
    function safeMint(address to, uint256 tokenId) external onlyRole(MINTER_ROLE) whenNotPaused {
        _safeMint(to, tokenId);
    }

    // -------------------------------------------------------------------------
    // Admin configuration
    // -------------------------------------------------------------------------

    /// @notice Updates the base URI used to construct per-token metadata URIs.
    /// @param baseURI_ New base URI string.
    function setBaseURI(string calldata baseURI_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        string memory previousURI = _baseTokenURI;
        _baseTokenURI = baseURI_;
        emit BaseURIUpdated(previousURI, baseURI_);
    }

    /// @notice Updates the collection-level metadata URI (OpenSea contractURI extension).
    /// @param contractMetadataURI_ New collection metadata URI.
    function setContractURI(string calldata contractMetadataURI_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        string memory previousURI = _contractMetadataURI;
        _contractMetadataURI = contractMetadataURI_;
        emit ContractURIUpdated(previousURI, contractMetadataURI_);
    }

    /// @notice Updates the default royalty receiver and fee for all tokens.
    /// @param receiver       Address that receives royalty payments.
    /// @param feeBasisPoints Royalty fee in basis points (10 000 = 100%).
    function setRoyaltyInfo(address receiver, uint96 feeBasisPoints) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (receiver == address(0)) revert ZeroAddress();
        _setDefaultRoyalty(receiver, feeBasisPoints);
        emit DefaultRoyaltyUpdated(receiver, feeBasisPoints);
    }

    /// @notice Pauses minting. Does not affect transfers.
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpauses minting.
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // -------------------------------------------------------------------------
    // Metadata
    // -------------------------------------------------------------------------

    /// @notice Returns the collection-level metadata URI (OpenSea extension).
    function contractURI() external view returns (string memory) {
        return _contractMetadataURI;
    }

    /// @notice Returns the base URI used to construct token metadata URLs.
    function baseURI() external view returns (string memory) {
        return _baseTokenURI;
    }

    // -------------------------------------------------------------------------
    // Internal overrides
    // -------------------------------------------------------------------------

    /// @dev Returns the base URI used to build tokenURI values.
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /// @dev Keeps ERC-721 ownership and enumerable indexes synchronized on mint and transfer.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    /// @dev Resolves the balance hook shared by ERC721 and ERC721Enumerable.
    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    // -------------------------------------------------------------------------
    // Interface support
    // -------------------------------------------------------------------------

    /// @inheritdoc ERC165
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC2981, AccessControlDefaultAdminRules)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
