using System.Numerics;
using Nethereum.Contracts.ContractHandlers;
using Nethereum.RPC.Eth.DTOs;
using Nethereum.Web3;
using Tricksfor.Blockchain.Nethereum.Contracts.TricksforBoosterNFT.ContractDefinition;

namespace Tricksfor.Blockchain.Nethereum.Contracts.TricksforBoosterNFT
{
    /// <summary>
    /// Typed service for interacting with the TricksforBoosterNFT contract.
    /// All calls use typed function message classes — no raw ABI string decoding.
    /// </summary>
    public class TricksforBoosterNFTService
    {
        private readonly IWeb3 _web3;
        private readonly string _contractAddress;

        public TricksforBoosterNFTService(IWeb3 web3, string contractAddress)
        {
            _web3 = web3;
            _contractAddress = contractAddress;
        }

        public IContractQueryHandler<TFunction> GetContractQueryHandler<TFunction>()
            where TFunction : FunctionMessage, new()
            => _web3.Eth.GetContractQueryHandler<TFunction>();

        public IContractTransactionHandler<TFunction> GetContractTransactionHandler<TFunction>()
            where TFunction : FunctionMessage, new()
            => _web3.Eth.GetContractTransactionHandler<TFunction>();

        // -------------------------------------------------------------------------
        // Deployment
        // -------------------------------------------------------------------------

        public static Task<TransactionReceipt> DeployContractAndWaitForReceiptAsync(
            IWeb3 web3,
            TricksforBoosterNFTDeployment deployment)
            => web3.Eth.GetContractDeploymentHandler<TricksforBoosterNFTDeployment>()
                .SendRequestAndWaitForReceiptAsync(deployment);

        // -------------------------------------------------------------------------
        // Read functions
        // -------------------------------------------------------------------------

        public Task<string> NameQueryAsync()
            => _web3.Eth.GetContractQueryHandler<NameFunction>()
                .QueryAsync<string>(_contractAddress, new NameFunction());

        public Task<string> SymbolQueryAsync()
            => _web3.Eth.GetContractQueryHandler<SymbolFunction>()
                .QueryAsync<string>(_contractAddress, new SymbolFunction());

        public Task<string> OwnerQueryAsync()
            => _web3.Eth.GetContractQueryHandler<OwnerFunction>()
                .QueryAsync<string>(_contractAddress, new OwnerFunction());

        public Task<bool> PausedQueryAsync()
            => _web3.Eth.GetContractQueryHandler<PausedFunction>()
                .QueryAsync<bool>(_contractAddress, new PausedFunction());

        public Task<string> TokenUriQueryAsync(BigInteger tokenId)
            => _web3.Eth.GetContractQueryHandler<TokenUriFunction>()
                .QueryAsync<string>(_contractAddress, new TokenUriFunction { TokenId = tokenId });

        public Task<string> ContractUriQueryAsync()
            => _web3.Eth.GetContractQueryHandler<ContractUriFunction>()
                .QueryAsync<string>(_contractAddress, new ContractUriFunction());

        public Task<string> OwnerOfQueryAsync(BigInteger tokenId)
            => _web3.Eth.GetContractQueryHandler<OwnerOfFunction>()
                .QueryAsync<string>(_contractAddress, new OwnerOfFunction { TokenId = tokenId });

        public Task<BigInteger> BalanceOfQueryAsync(string ownerAddress)
            => _web3.Eth.GetContractQueryHandler<BalanceOfFunction>()
                .QueryAsync<BigInteger>(_contractAddress, new BalanceOfFunction { Owner = ownerAddress });

        public Task<RoyaltyInfoOutputDTO> RoyaltyInfoQueryAsync(BigInteger tokenId, BigInteger salePrice)
            => _web3.Eth.GetContractQueryHandler<RoyaltyInfoFunction>()
                .QueryDeserializingToObjectAsync<RoyaltyInfoOutputDTO>(
                    new RoyaltyInfoFunction { TokenId = tokenId, SalePrice = salePrice },
                    _contractAddress);

        public Task<bool> SupportsInterfaceQueryAsync(byte[] interfaceId)
            => _web3.Eth.GetContractQueryHandler<SupportsInterfaceFunction>()
                .QueryAsync<bool>(_contractAddress, new SupportsInterfaceFunction { InterfaceId = interfaceId });

        // -------------------------------------------------------------------------
        // Write functions
        // -------------------------------------------------------------------------

        public Task<TransactionReceipt> MintRequestAndWaitForReceiptAsync(string toAddress)
            => _web3.Eth.GetContractTransactionHandler<MintFunction>()
                .SendRequestAndWaitForReceiptAsync(
                    _contractAddress,
                    new MintFunction { To = toAddress });

        public Task<TransactionReceipt> ApproveRequestAndWaitForReceiptAsync(string toAddress, BigInteger tokenId)
            => _web3.Eth.GetContractTransactionHandler<ApproveFunction>()
                .SendRequestAndWaitForReceiptAsync(
                    _contractAddress,
                    new ApproveFunction { To = toAddress, TokenId = tokenId });

        public Task<TransactionReceipt> SetApprovalForAllRequestAndWaitForReceiptAsync(string operatorAddress, bool approved)
            => _web3.Eth.GetContractTransactionHandler<SetApprovalForAllFunction>()
                .SendRequestAndWaitForReceiptAsync(
                    _contractAddress,
                    new SetApprovalForAllFunction { Operator = operatorAddress, Approved = approved });

        public Task<TransactionReceipt> SetBaseUriRequestAndWaitForReceiptAsync(string baseUri)
            => _web3.Eth.GetContractTransactionHandler<SetBaseUriFunction>()
                .SendRequestAndWaitForReceiptAsync(
                    _contractAddress,
                    new SetBaseUriFunction { BaseUri = baseUri });

        public Task<TransactionReceipt> SetContractUriRequestAndWaitForReceiptAsync(string contractMetadataUri)
            => _web3.Eth.GetContractTransactionHandler<SetContractUriFunction>()
                .SendRequestAndWaitForReceiptAsync(
                    _contractAddress,
                    new SetContractUriFunction { ContractMetadataUri = contractMetadataUri });

        public Task<TransactionReceipt> SetRoyaltyInfoRequestAndWaitForReceiptAsync(string receiver, BigInteger feeBasisPoints)
            => _web3.Eth.GetContractTransactionHandler<SetRoyaltyInfoFunction>()
                .SendRequestAndWaitForReceiptAsync(
                    _contractAddress,
                    new SetRoyaltyInfoFunction { Receiver = receiver, FeeBasisPoints = feeBasisPoints });

        public Task<TransactionReceipt> PauseRequestAndWaitForReceiptAsync()
            => _web3.Eth.GetContractTransactionHandler<PauseFunction>()
                .SendRequestAndWaitForReceiptAsync(_contractAddress, new PauseFunction());

        public Task<TransactionReceipt> UnpauseRequestAndWaitForReceiptAsync()
            => _web3.Eth.GetContractTransactionHandler<UnpauseFunction>()
                .SendRequestAndWaitForReceiptAsync(_contractAddress, new UnpauseFunction());
    }
}
