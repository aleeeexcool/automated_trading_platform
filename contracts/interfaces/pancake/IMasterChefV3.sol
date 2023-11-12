// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../uniswap/v3/INonfungiblePositionManager.sol";
import "./IPancakeV3Pool.sol";

interface IMasterChefV3 {

    // *** Enumerable ***
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);

    function balanceOf(address owner) external view returns (uint256);

    // *** MasterChefV3 ***

    function poolInfo(uint256 _pid) external view returns (
        uint256 allocPoint,
        // V3 pool address
        IPancakeV3Pool v3Pool,
        // V3 pool token0 address
        address token0,
        // V3 pool token1 address
        address token1,
        // V3 pool fee
        uint24 fee,
        // total liquidity staking in the pool
        uint256 totalLiquidity,
        // total boost liquidity staking in the pool
        uint256 totalBoostLiquidity);

    function userPositionInfos(uint256 _tokenId) external view returns (
        uint128 liquidity,
        uint128 boostLiquidity,
        int24 tickLower,
        int24 tickUpper,
        uint256 rewardGrowthInside,
        uint256 reward,
        address user,
        uint256 pid,
        uint256 boostMultiplier);

    /// @notice Returns the cake per second , period end time.
    /// @param _pid The pool pid.
    /// @return cakePerSecond Cake reward per second.
    /// @return endTime Period end time.
    function getLatestPeriodInfoByPid(uint256 _pid) external view returns (uint256 cakePerSecond, uint256 endTime);

    /// @notice Returns the cake per second , period end time. This is for liquidity mining pool.
    /// @param _v3Pool Address of the V3 pool.
    /// @return cakePerSecond Cake reward per second.
    /// @return endTime Period end time.
    function getLatestPeriodInfo(address _v3Pool) external view returns (uint256 cakePerSecond, uint256 endTime);

    /// @notice View function for checking pending CAKE rewards.
    /// @dev The pending cake amount is based on the last state in LMPool. The actual amount will happen whenever liquidity changes or harvest.
    /// @param _tokenId Token Id of NFT.
    /// @return reward Pending reward.
    function pendingCake(uint256 _tokenId) external view returns (uint256 reward);

    /// @notice harvest cake from pool.
    /// @param _tokenId Token Id of NFT.
    /// @param _to Address to.
    /// @return reward Cake reward.
    function harvest(uint256 _tokenId, address _to) external returns (uint256 reward);

    /// @notice Withdraw LP tokens from pool.
    /// @param _tokenId Token Id of NFT to deposit.
    /// @param _to Address to which NFT token to withdraw.
    /// @return reward Cake reward.
    function withdraw(uint256 _tokenId, address _to) external returns (uint256 reward);

    /// @notice Update liquidity for the NFT position.
    /// @param _tokenId Token Id of NFT to update.
    function updateLiquidity(uint256 _tokenId) external;

    /// @notice Increases the amount of liquidity in a position, with tokens paid by the `msg.sender`
    /// @param params tokenId The ID of the token for which liquidity is being increased,
    /// amount0Desired The desired amount of token0 to be spent,
    /// amount1Desired The desired amount of token1 to be spent,
    /// amount0Min The minimum amount of token0 to spend, which serves as a slippage check,
    /// amount1Min The minimum amount of token1 to spend, which serves as a slippage check,
    /// deadline The time by which the transaction must be included to effect the change
    /// @return liquidity The new liquidity amount as a result of the increase
    /// @return amount0 The amount of token0 to acheive resulting liquidity
    /// @return amount1 The amount of token1 to acheive resulting liquidity
    function increaseLiquidity(
        INonfungiblePositionManager.IncreaseLiquidityParams memory params
    ) external payable returns (uint128 liquidity, uint256 amount0, uint256 amount1);

    /// @notice Decreases the amount of liquidity in a position and accounts it to the position
    /// @param params tokenId The ID of the token for which liquidity is being decreased,
    /// amount The amount by which liquidity will be decreased,
    /// amount0Min The minimum amount of token0 that should be accounted for the burned liquidity,
    /// amount1Min The minimum amount of token1 that should be accounted for the burned liquidity,
    /// deadline The time by which the transaction must be included to effect the change
    /// @return amount0 The amount of token0 accounted to the position's tokens owed
    /// @return amount1 The amount of token1 accounted to the position's tokens owed
    function decreaseLiquidity(
        INonfungiblePositionManager.DecreaseLiquidityParams memory params
    ) external returns (uint256 amount0, uint256 amount1);

    /// @notice Collects up to a maximum amount of fees owed to a specific position to the recipient
    /// @param params tokenId The ID of the NFT for which tokens are being collected,
    /// recipient The account that should receive the tokens,
    /// @dev Warning!!! Please make sure to use multicall to call unwrapWETH9 or sweepToken when set recipient address(0), or you will lose your funds.
    /// amount0Max The maximum amount of token0 to collect,
    /// amount1Max The maximum amount of token1 to collect
    /// @return amount0 The amount of fees collected in token0
    /// @return amount1 The amount of fees collected in token1
    function collect(INonfungiblePositionManager.CollectParams memory params) external returns (uint256 amount0, uint256 amount1);

    /// @notice Collects up to a maximum amount of fees owed to a specific position to the recipient, then refund.
    /// @param params CollectParams.
    /// @param to Refund recipent.
    /// @return amount0 The amount of fees collected in token0
    /// @return amount1 The amount of fees collected in token1
    function collectTo(
        INonfungiblePositionManager.CollectParams memory params,
        address to
    ) external returns (uint256 amount0, uint256 amount1);

    /// @notice Unwraps the contract's WETH9 balance and sends it to recipient as ETH.
    /// @dev The amountMinimum parameter prevents malicious contracts from stealing WETH9 from users.
    /// @param amountMinimum The minimum amount of WETH9 to unwrap
    /// @param recipient The address receiving ETH
    function unwrapWETH9(uint256 amountMinimum, address recipient) external;

    /// @notice Transfers the full amount of a token held by this contract to recipient
    /// @dev The amountMinimum parameter prevents malicious contracts from stealing the token from users
    /// @param token The contract address of the token which will be transferred to `recipient`
    /// @param amountMinimum The minimum amount of token required for a transfer
    /// @param recipient The destination address of the token
    function sweepToken(address token, uint256 amountMinimum, address recipient) external;

    /// @notice Burns a token ID, which deletes it from the NFT contract. The token must have 0 liquidity and all tokens
    /// must be collected first.
    /// @param _tokenId The ID of the token that is being burned
    function burn(uint256 _tokenId) external;
}

