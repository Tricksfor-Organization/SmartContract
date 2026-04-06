# Nethereum Task Template

Use this template when requesting AI-assisted Nethereum C# integration work in the Tricksfor SmartContract repository. Fill in the bracketed sections before submitting. Remove sections that do not apply.

---

## Task Type

<!-- Select one or more: -->
- [ ] Add deployment message (contract deployment)
- [ ] Add function message (contract function call)
- [ ] Add event DTO (event decoding)
- [ ] Add or update contract service class
- [ ] Update integration test
- [ ] Verify ABI/event compatibility after contract change
- [ ] Regenerate ABI/BIN artifacts

---

## Context

**Contract(s) affected:**
<!-- e.g., TricksforBoosterNFT, TricksforBoosterStaking, or both -->

**Related Solidity change (if any):**
<!-- Link to the PR or commit that changed the contract interface -->

**Brief description of the change:**
<!-- 1–3 sentences describing what Nethereum work is needed and why -->

---

## ABI/BIN Artifact Status

<!-- Complete this section when working from a contract change. -->

**Has the contract interface changed?**
- [ ] Yes — ABI and BIN artifacts must be regenerated and committed before this work begins
- [ ] No — existing artifacts are current

**Artifact file location:**
<!-- e.g., /artifacts/TricksforBoosterStaking.abi, /artifacts/TricksforBoosterStaking.bin -->

---

## Deployment Message

<!-- Complete this section if adding or updating a contract deployment message. -->

**Contract:** <!-- e.g., TricksforBoosterStaking -->

**Constructor parameters:**

| Parameter Name | Solidity Type | C# Type | Description |
|---|---|---|---|
| | | | |

**Expected C# class name:** `[ContractName]DeploymentMessage`

---

## Function Message

<!-- Complete this section if adding or updating a contract function call. -->

**Function signature:**
```solidity
// e.g., function stake(uint256 tokenId) external;
```

**Function parameters:**

| Solidity Name | Solidity Type | C# Property Name | C# Type |
|---|---|---|---|
| | | | |

**Return type (if view/pure):**

**Expected C# class name:** `[FunctionName]Function`

---

## Event DTO

<!-- Complete this section if adding or updating an event DTO. -->

**Event signature:**
```solidity
// e.g., event TokenStaked(address indexed staker, uint256 indexed tokenId, uint256 stakedAt);
```

**Event parameters:**

| Solidity Name | Solidity Type | Indexed | C# Property Name | C# Type | `[Parameter]` Order |
|---|---|---|---|---|---|
| `staker` | `address` | ✅ | `Staker` | `string` | 1 |
| `tokenId` | `uint256` | ✅ | `TokenId` | `BigInteger` | 2 |
| `stakedAt` | `uint256` | ❌ | `StakedAt` | `BigInteger` | 3 |

> ⚠️ Field names, types, indexed attributes, and parameter order must **exactly** match the Solidity event definition. Any mismatch will cause silent decoding failures.

**Expected C# class name:** `[EventName]EventDTO`

---

## Contract Service

<!-- Complete this section if adding or updating a contract service class. -->

**Contract:** <!-- e.g., TricksforBoosterStaking -->

**Methods to expose via the service:**

| Method | Type | Description |
|---|---|---|
| | Function / Event | |

**Does the service need to subscribe to events?**
- [ ] Yes — describe the event subscription pattern needed
- [ ] No

---

## Integration Test Requirements

<!-- Describe what integration tests must be written or updated. -->

Integration tests in this repository must:
- Deploy real contracts to a local Hardhat/Ganache node (no mocking)
- Submit transactions and read both on-chain state and emitted logs
- Assert decoded event DTO field values match expected values
- Use typed function message and event DTO classes — no raw ABI string decoding

**Test scenarios to cover:**

- [ ] [Describe happy-path test: submit transaction, verify state, verify event DTO fields]
- [ ] [Describe error-case test: unauthorized call, invalid input, etc.]
- [ ] [Describe event DTO test: confirm all fields decode correctly with correct values]

---

## Compatibility Verification Checklist

Before finalizing Nethereum changes, confirm:

- [ ] Every event DTO field name exactly matches the Solidity event parameter name (case-sensitive)
- [ ] Every event DTO field type correctly maps from Solidity to C# (e.g., `address` → `string`, `uint256` → `BigInteger`)
- [ ] `[Parameter(..., isIndexed: true/false)]` attributes match the Solidity `indexed` keyword on every field
- [ ] Parameter order in `[Parameter(order)]` attributes matches the Solidity event definition
- [ ] ABI artifacts used in tests match the current contract source
- [ ] Function message class parameter names and types match the Solidity function signature
- [ ] Integration tests pass against the current contract ABI

---

## Additional Notes

<!-- Any other context, tradeoffs, or constraints the AI should be aware of. -->
