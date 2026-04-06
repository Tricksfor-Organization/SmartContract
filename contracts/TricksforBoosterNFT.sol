// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title TricksforBoosterNFT
/// @notice ERC-721 NFT collection for Tricksfor Booster items.
///         OpenSea-compatible: supports tokenURI, contractURI, and ERC-2981 royalties.
///         Minting is owner-only and can be paused.
/// @dev Does not include staking logic — staking is handled by TricksforBoosterStaking.
contract TricksforBoosterNFT is ERC721, ERC2981, Ownable, Pausable {
    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    /// @notice Thrown when attempting to query or interact with a non-existent token.
    error TokenDoesNotExist(uint256 tokenId);

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    string private _baseTokenURI;
    string private _contractMetadataURI;

    /// @notice Tracks the next token ID to be minted. Starts at 1.
    uint256 private _nextTokenId = 1;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param name_                  ERC-721 collection name
    /// @param symbol_                ERC-721 collection symbol
    /// @param baseURI_               Base URI for token metadata (appended with tokenId)
    /// @param contractMetadataURI_   URI for OpenSea collection-level metadata
    /// @param royaltyReceiver_       Address that receives royalty payments
    /// @param royaltyFeeBasisPoints_ Royalty fee in basis points (10 000 = 100%)
    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        string memory contractMetadataURI_,
        address royaltyReceiver_,
        uint96 royaltyFeeBasisPoints_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        _baseTokenURI = baseURI_;
        _contractMetadataURI = contractMetadataURI_;
        _setDefaultRoyalty(royaltyReceiver_, royaltyFeeBasisPoints_);
    }

    // -------------------------------------------------------------------------
    // Minting
    // -------------------------------------------------------------------------

    /// @notice Mints the next token to the given address. Only callable by the owner.
    /// @param to Recipient address for the newly minted token.
    function mint(address to) external onlyOwner whenNotPaused {
        uint256 tokenId = _nextTokenId;
        unchecked {
            _nextTokenId = tokenId + 1;
        }
        _safeMint(to, tokenId);
    }

    // -------------------------------------------------------------------------
    // Admin configuration
    // -------------------------------------------------------------------------

    /// @notice Updates the base URI used to construct per-token metadata URIs.
    /// @param baseURI_ New base URI string.
    function setBaseURI(string calldata baseURI_) external onlyOwner {
        _baseTokenURI = baseURI_;
    }

    /// @notice Updates the collection-level metadata URI (OpenSea contractURI extension).
    /// @param contractMetadataURI_ New collection metadata URI.
    function setContractURI(string calldata contractMetadataURI_) external onlyOwner {
        _contractMetadataURI = contractMetadataURI_;
    }

    /// @notice Updates the default royalty receiver and fee for all tokens.
    /// @param receiver       Address that receives royalty payments.
    /// @param feeBasisPoints Royalty fee in basis points (10 000 = 100%).
    function setRoyaltyInfo(address receiver, uint96 feeBasisPoints) external onlyOwner {
        _setDefaultRoyalty(receiver, feeBasisPoints);
    }

    /// @notice Pauses minting. Does not affect transfers.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpauses minting.
    function unpause() external onlyOwner {
        _unpause();
    }

    // -------------------------------------------------------------------------
    // Metadata
    // -------------------------------------------------------------------------

    /// @notice Returns the collection-level metadata URI (OpenSea extension).
    function contractURI() external view returns (string memory) {
        return _contractMetadataURI;
    }

    // -------------------------------------------------------------------------
    // Internal overrides
    // -------------------------------------------------------------------------

    /// @dev Returns the base URI used to build tokenURI values.
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // -------------------------------------------------------------------------
    // Interface support
    // -------------------------------------------------------------------------

    /// @inheritdoc ERC165
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
