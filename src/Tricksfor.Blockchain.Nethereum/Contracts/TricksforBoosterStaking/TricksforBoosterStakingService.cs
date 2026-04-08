using System.Numerics;
using Nethereum.Contracts;
using Nethereum.Contracts.ContractHandlers;
using Nethereum.RPC.Eth.DTOs;
using Nethereum.Web3;
using Tricksfor.Blockchain.Nethereum.Contracts.TricksforBoosterStaking.ContractDefinition;

namespace Tricksfor.Blockchain.Nethereum.Contracts.TricksforBoosterStaking
{
    /// <summary>
    /// Typed service for interacting with the TricksforBoosterStaking contract.
    /// All calls use typed function message classes — no raw ABI string decoding.
    ///
    /// Integration-critical events:
    ///   - TokenStakedEventDTO — emitted on every successful stake
    ///   - TokenUnstakedEventDTO — emitted on every successful unstake
    ///   - EmergencyWithdrawnEventDTO — emitted on every emergency withdrawal
    ///
    /// The Tricksfor backend indexer depends on these events to reconstruct
    /// staking state. Changes to event schema require downstream coordination.
    /// </summary>
    public class TricksforBoosterStakingService
    {
        private readonly IWeb3 _web3;
        private readonly string _contractAddress;

        public TricksforBoosterStakingService(IWeb3 web3, string contractAddress)
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
            TricksforBoosterStakingDeployment deployment)
            => web3.Eth.GetContractDeploymentHandler<TricksforBoosterStakingDeployment>()
                .SendRequestAndWaitForReceiptAsync(deployment);

        // -------------------------------------------------------------------------
        // Read functions (must stay in sync with event semantics)
        // -------------------------------------------------------------------------

        public Task<string> NftContractQueryAsync()
            => _web3.Eth.GetContractQueryHandler<NftContractFunction>()
                .QueryAsync<string>(_contractAddress, new NftContractFunction());

        public Task<string> OwnerQueryAsync()
            => _web3.Eth.GetContractQueryHandler<OwnerFunction>()
                .QueryAsync<string>(_contractAddress, new OwnerFunction());

        public Task<bool> PausedQueryAsync()
            => _web3.Eth.GetContractQueryHandler<PausedFunction>()
                .QueryAsync<bool>(_contractAddress, new PausedFunction());

        /// <summary>
        /// Returns true if the given token is currently staked.
        /// Result is consistent with the TokenStaked / TokenUnstaked event stream.
        /// </summary>
        public Task<bool> IsStakedQueryAsync(BigInteger tokenId)
            => _web3.Eth.GetContractQueryHandler<IsStakedFunction>()
                .QueryAsync<bool>(_contractAddress, new IsStakedFunction { TokenId = tokenId });

        /// <summary>
        /// Returns the original staker address for a currently staked token,
        /// or the zero address if the token is not staked.
        /// The returned address matches the staker field emitted in TokenStaked.
        /// </summary>
        public Task<string> StakedOwnerOfQueryAsync(BigInteger tokenId)
            => _web3.Eth.GetContractQueryHandler<StakedOwnerOfFunction>()
                .QueryAsync<string>(_contractAddress, new StakedOwnerOfFunction { TokenId = tokenId });

        /// <summary>
        /// Returns the block timestamp at which the given token was staked,
        /// or zero if the token is not currently staked.
        /// </summary>
        public Task<BigInteger> StakedAtOfQueryAsync(BigInteger tokenId)
            => _web3.Eth.GetContractQueryHandler<StakedAtOfFunction>()
                .QueryAsync<BigInteger>(_contractAddress, new StakedAtOfFunction { TokenId = tokenId });

        /// <summary>
        /// Returns all token IDs currently staked by the given wallet address.
        /// Ordering is not guaranteed — the contract uses swap-and-pop removal.
        /// </summary>
        public Task<GetWalletStakedTokensOutputDTO> GetWalletStakedTokensQueryAsync(string walletAddress)
            => _web3.Eth.GetContractQueryHandler<GetWalletStakedTokensFunction>()
                .QueryDeserializingToObjectAsync<GetWalletStakedTokensOutputDTO>(
                    new GetWalletStakedTokensFunction { Wallet = walletAddress },
                    _contractAddress);

        // -------------------------------------------------------------------------
        // Write functions
        // -------------------------------------------------------------------------

        /// <summary>
        /// Stakes a Booster NFT. The caller must have previously approved the staking
        /// contract on the NFT contract. Emits TokenStaked on success.
        /// </summary>
        public Task<TransactionReceipt> StakeRequestAndWaitForReceiptAsync(BigInteger tokenId)
            => _web3.Eth.GetContractTransactionHandler<StakeFunction>()
                .SendRequestAndWaitForReceiptAsync(
                    _contractAddress,
                    new StakeFunction { TokenId = tokenId });

        /// <summary>
        /// Unstakes a Booster NFT and returns it to the original staker.
        /// Emits TokenUnstaked on success. Not gated by pause.
        /// </summary>
        public Task<TransactionReceipt> UnstakeRequestAndWaitForReceiptAsync(BigInteger tokenId)
            => _web3.Eth.GetContractTransactionHandler<UnstakeFunction>()
                .SendRequestAndWaitForReceiptAsync(
                    _contractAddress,
                    new UnstakeFunction { TokenId = tokenId });

        /// <summary>
        /// Emergency withdrawal of a staked token to a specified recipient.
        /// Owner only. Emits EmergencyWithdrawn on success.
        /// </summary>
        public Task<TransactionReceipt> EmergencyWithdrawRequestAndWaitForReceiptAsync(
            BigInteger tokenId,
            string recipient)
            => _web3.Eth.GetContractTransactionHandler<EmergencyWithdrawFunction>()
                .SendRequestAndWaitForReceiptAsync(
                    _contractAddress,
                    new EmergencyWithdrawFunction { TokenId = tokenId, Recipient = recipient });

        public Task<TransactionReceipt> PauseRequestAndWaitForReceiptAsync()
            => _web3.Eth.GetContractTransactionHandler<PauseFunction>()
                .SendRequestAndWaitForReceiptAsync(_contractAddress, new PauseFunction());

        public Task<TransactionReceipt> UnpauseRequestAndWaitForReceiptAsync()
            => _web3.Eth.GetContractTransactionHandler<UnpauseFunction>()
                .SendRequestAndWaitForReceiptAsync(_contractAddress, new UnpauseFunction());

        // -------------------------------------------------------------------------
        // Event log decoding
        // -------------------------------------------------------------------------

        /// <summary>
        /// Decodes all TokenStaked events from a transaction receipt.
        /// </summary>
        public List<EventLog<TokenStakedEventDTO>> DecodeTokenStakedEvents(TransactionReceipt receipt)
            => receipt.DecodeAllEvents<TokenStakedEventDTO>();

        /// <summary>
        /// Decodes all TokenUnstaked events from a transaction receipt.
        /// </summary>
        public List<EventLog<TokenUnstakedEventDTO>> DecodeTokenUnstakedEvents(TransactionReceipt receipt)
            => receipt.DecodeAllEvents<TokenUnstakedEventDTO>();

        /// <summary>
        /// Decodes all EmergencyWithdrawn events from a transaction receipt.
        /// </summary>
        public List<EventLog<EmergencyWithdrawnEventDTO>> DecodeEmergencyWithdrawnEvents(TransactionReceipt receipt)
            => receipt.DecodeAllEvents<EmergencyWithdrawnEventDTO>();

        /// <summary>
        /// Returns a filter input for querying TokenStaked events by staker address.
        /// Use with block-range log queries to reconstruct staking history.
        /// </summary>
        public NewFilterInput CreateTokenStakedFilterByStaker(
            string stakerAddress,
            BlockParameter? fromBlock = null,
            BlockParameter? toBlock = null)
        {
            var eventHandler = _web3.Eth.GetEvent<TokenStakedEventDTO>(_contractAddress);
            return eventHandler.CreateFilterInput(stakerAddress, fromBlock, toBlock);
        }

        /// <summary>
        /// Returns a filter input for querying TokenUnstaked events by staker address.
        /// </summary>
        public NewFilterInput CreateTokenUnstakedFilterByStaker(
            string stakerAddress,
            BlockParameter? fromBlock = null,
            BlockParameter? toBlock = null)
        {
            var eventHandler = _web3.Eth.GetEvent<TokenUnstakedEventDTO>(_contractAddress);
            return eventHandler.CreateFilterInput(stakerAddress, fromBlock, toBlock);
        }

        /// <summary>
        /// Returns a filter input for querying TokenStaked events by token ID.
        /// </summary>
        public NewFilterInput CreateTokenStakedFilterByTokenId(
            BigInteger tokenId,
            BlockParameter? fromBlock = null,
            BlockParameter? toBlock = null)
        {
            var eventHandler = _web3.Eth.GetEvent<TokenStakedEventDTO>(_contractAddress);
            return eventHandler.CreateFilterInput<string?, BigInteger?>(null, tokenId, fromBlock, toBlock);
        }
    }
}
