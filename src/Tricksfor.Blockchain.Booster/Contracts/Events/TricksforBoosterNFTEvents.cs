using System.Numerics;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;

namespace Tricksfor.Blockchain.Booster.Contracts.Events
{
    [Event("BaseURIUpdated")]
    public class BaseUriUpdatedEventDTO : IEventDTO
    {
        [Parameter("string", "previousURI", 1, false)]
        public string PreviousUri { get; set; } = string.Empty;

        [Parameter("string", "newURI", 2, false)]
        public string NewUri { get; set; } = string.Empty;
    }

    [Event("ContractURIUpdated")]
    public class ContractUriUpdatedEventDTO : IEventDTO
    {
        [Parameter("string", "previousURI", 1, false)]
        public string PreviousUri { get; set; } = string.Empty;

        [Parameter("string", "newURI", 2, false)]
        public string NewUri { get; set; } = string.Empty;
    }

    [Event("DefaultRoyaltyUpdated")]
    public class DefaultRoyaltyUpdatedEventDTO : IEventDTO
    {
        [Parameter("address", "receiver", 1, true)]
        public string Receiver { get; set; } = string.Empty;

        [Parameter("uint96", "feeBasisPoints", 2, false)]
        public BigInteger FeeBasisPoints { get; set; }
    }
}
