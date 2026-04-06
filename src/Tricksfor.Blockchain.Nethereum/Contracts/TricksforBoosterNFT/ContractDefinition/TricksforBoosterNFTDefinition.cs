using System.Numerics;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;

namespace Tricksfor.Blockchain.Nethereum.Contracts.TricksforBoosterNFT.ContractDefinition
{
    /// <summary>
    /// Deployment message for TricksforBoosterNFT.
    /// Constructor parameters must match the Solidity constructor exactly.
    /// </summary>
    public class TricksforBoosterNFTDeployment : ContractDeploymentMessage
    {
        public static string ABI => TricksforBoosterNFTAbi.Abi;

        public TricksforBoosterNFTDeployment() : base(TricksforBoosterNFTAbi.Bytecode) { }

        [Parameter("string", "name_", 1)]
        public string Name { get; set; } = string.Empty;

        [Parameter("string", "symbol_", 2)]
        public string Symbol { get; set; } = string.Empty;

        [Parameter("string", "baseURI_", 3)]
        public string BaseUri { get; set; } = string.Empty;

        [Parameter("string", "contractMetadataURI_", 4)]
        public string ContractMetadataUri { get; set; } = string.Empty;

        [Parameter("address", "royaltyReceiver_", 5)]
        public string RoyaltyReceiver { get; set; } = string.Empty;

        /// <summary>
        /// Royalty fee in basis points (10 000 = 100%).
        /// </summary>
        [Parameter("uint96", "royaltyFeeBasisPoints_", 6)]
        public BigInteger RoyaltyFeeBasisPoints { get; set; }
    }

    // -------------------------------------------------------------------------
    // Read (view/pure) function messages
    // -------------------------------------------------------------------------

    [Function("name", "string")]
    public class NameFunction : FunctionMessage { }

    [Function("symbol", "string")]
    public class SymbolFunction : FunctionMessage { }

    [Function("MINTER_ROLE", "bytes32")]
    public class MinterRoleFunction : FunctionMessage { }

    [Function("DEFAULT_ADMIN_ROLE", "bytes32")]
    public class DefaultAdminRoleFunction : FunctionMessage { }

    [Function("hasRole", "bool")]
    public class HasRoleFunction : FunctionMessage
    {
        [Parameter("bytes32", "role", 1)]
        public byte[] Role { get; set; } = Array.Empty<byte>();

        [Parameter("address", "account", 2)]
        public string Account { get; set; } = string.Empty;
    }

    [Function("getRoleAdmin", "bytes32")]
    public class GetRoleAdminFunction : FunctionMessage
    {
        [Parameter("bytes32", "role", 1)]
        public byte[] Role { get; set; } = Array.Empty<byte>();
    }

    [Function("paused", "bool")]
    public class PausedFunction : FunctionMessage { }

    [Function("tokenURI", "string")]
    public class TokenUriFunction : FunctionMessage
    {
        [Parameter("uint256", "tokenId", 1)]
        public BigInteger TokenId { get; set; }
    }

    [Function("contractURI", "string")]
    public class ContractUriFunction : FunctionMessage { }

    [Function("ownerOf", "address")]
    public class OwnerOfFunction : FunctionMessage
    {
        [Parameter("uint256", "tokenId", 1)]
        public BigInteger TokenId { get; set; }
    }

    [Function("balanceOf", "uint256")]
    public class BalanceOfFunction : FunctionMessage
    {
        [Parameter("address", "owner", 1)]
        public string Owner { get; set; } = string.Empty;
    }

    [Function("getApproved", "address")]
    public class GetApprovedFunction : FunctionMessage
    {
        [Parameter("uint256", "tokenId", 1)]
        public BigInteger TokenId { get; set; }
    }

    [Function("isApprovedForAll", "bool")]
    public class IsApprovedForAllFunction : FunctionMessage
    {
        [Parameter("address", "owner", 1)]
        public string Owner { get; set; } = string.Empty;

        [Parameter("address", "operator", 2)]
        public string Operator { get; set; } = string.Empty;
    }

    [Function("royaltyInfo")]
    public class RoyaltyInfoFunction : FunctionMessage
    {
        [Parameter("uint256", "tokenId", 1)]
        public BigInteger TokenId { get; set; }

        [Parameter("uint256", "salePrice", 2)]
        public BigInteger SalePrice { get; set; }
    }

    [Function("supportsInterface", "bool")]
    public class SupportsInterfaceFunction : FunctionMessage
    {
        [Parameter("bytes4", "interfaceId", 1)]
        public byte[] InterfaceId { get; set; } = Array.Empty<byte>();
    }

    // -------------------------------------------------------------------------
    // Write (transaction) function messages
    // -------------------------------------------------------------------------

    [Function("safeMint")]
    public class SafeMintFunction : FunctionMessage
    {
        [Parameter("address", "to", 1)]
        public string To { get; set; } = string.Empty;

        [Parameter("uint256", "tokenId", 2)]
        public BigInteger TokenId { get; set; }
    }

    [Function("approve")]
    public class ApproveFunction : FunctionMessage
    {
        [Parameter("address", "to", 1)]
        public string To { get; set; } = string.Empty;

        [Parameter("uint256", "tokenId", 2)]
        public BigInteger TokenId { get; set; }
    }

    [Function("setApprovalForAll")]
    public class SetApprovalForAllFunction : FunctionMessage
    {
        [Parameter("address", "operator", 1)]
        public string Operator { get; set; } = string.Empty;

        [Parameter("bool", "approved", 2)]
        public bool Approved { get; set; }
    }

    [Function("transferFrom")]
    public class TransferFromFunction : FunctionMessage
    {
        [Parameter("address", "from", 1)]
        public string From { get; set; } = string.Empty;

        [Parameter("address", "to", 2)]
        public string To { get; set; } = string.Empty;

        [Parameter("uint256", "tokenId", 3)]
        public BigInteger TokenId { get; set; }
    }

    [Function("safeTransferFrom")]
    public class SafeTransferFromFunction : FunctionMessage
    {
        [Parameter("address", "from", 1)]
        public string From { get; set; } = string.Empty;

        [Parameter("address", "to", 2)]
        public string To { get; set; } = string.Empty;

        [Parameter("uint256", "tokenId", 3)]
        public BigInteger TokenId { get; set; }
    }

    [Function("setBaseURI")]
    public class SetBaseUriFunction : FunctionMessage
    {
        [Parameter("string", "baseURI_", 1)]
        public string BaseUri { get; set; } = string.Empty;
    }

    [Function("setContractURI")]
    public class SetContractUriFunction : FunctionMessage
    {
        [Parameter("string", "contractMetadataURI_", 1)]
        public string ContractMetadataUri { get; set; } = string.Empty;
    }

    [Function("setRoyaltyInfo")]
    public class SetRoyaltyInfoFunction : FunctionMessage
    {
        [Parameter("address", "receiver", 1)]
        public string Receiver { get; set; } = string.Empty;

        /// <summary>
        /// Royalty fee in basis points (10 000 = 100%).
        /// </summary>
        [Parameter("uint96", "feeBasisPoints", 2)]
        public BigInteger FeeBasisPoints { get; set; }
    }

    [Function("grantRole")]
    public class GrantRoleFunction : FunctionMessage
    {
        [Parameter("bytes32", "role", 1)]
        public byte[] Role { get; set; } = Array.Empty<byte>();

        [Parameter("address", "account", 2)]
        public string Account { get; set; } = string.Empty;
    }

    [Function("revokeRole")]
    public class RevokeRoleFunction : FunctionMessage
    {
        [Parameter("bytes32", "role", 1)]
        public byte[] Role { get; set; } = Array.Empty<byte>();

        [Parameter("address", "account", 2)]
        public string Account { get; set; } = string.Empty;
    }

    [Function("renounceRole")]
    /// <summary>
    /// DTO for OpenZeppelin AccessControl.renounceRole.
    /// </summary>
    public class RenounceRoleFunction : FunctionMessage
    {
        [Parameter("bytes32", "role", 1)]
        public byte[] Role { get; set; } = Array.Empty<byte>();

        /// <summary>
        /// Solidity <c>callerConfirmation</c> argument for <c>renounceRole</c>.
        /// Must be the same address as the transaction sender; otherwise the
        /// contract call reverts with <c>AccessControlBadConfirmation</c>.
        /// </summary>
        [Parameter("address", "callerConfirmation", 2)]
        public string CallerConfirmation { get; set; } = string.Empty;
    }

    [Function("pause")]
    public class PauseFunction : FunctionMessage { }

    [Function("unpause")]
    public class UnpauseFunction : FunctionMessage { }

    // -------------------------------------------------------------------------
    // Output DTOs
    // -------------------------------------------------------------------------

    [FunctionOutput]
    public class RoyaltyInfoOutputDTO : IFunctionOutputDTO
    {
        [Parameter("address", "receiver", 1)]
        public string Receiver { get; set; } = string.Empty;

        [Parameter("uint256", "royaltyAmount", 2)]
        public BigInteger RoyaltyAmount { get; set; }
    }
}
