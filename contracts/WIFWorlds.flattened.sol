// SPDX-License-Identifier: MIT
pragma solidity >=0.4.16 >=0.6.2 ^0.8.20;

// lib/openzeppelin-contracts/contracts/utils/Context.sol

// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 *
 * IMPORTANT: Deprecated in favor of accessing `msg.sender` and `msg.data` directly. This contract, along with its
 * `_msgSender`, `_msgData` and `_contextSuffixLength` functions, will be removed in v6.0, where contracts read
 * `msg.sender` and `msg.data` directly. Contracts that override `_msgSender`/`_msgData` (e.g. to support
 * meta-transactions) will lose that extension point; plan the migration before upgrading.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol

// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol

// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol

// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/extensions/IERC20Metadata.sol)

/**
 * @dev Interface for the optional metadata functions from the ERC-20 standard.
 */
interface IERC20Metadata is IERC20 {
    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals places of the token.
     */
    function decimals() external view returns (uint8);
}

// lib/openzeppelin-contracts/contracts/access/Ownable.sol

// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC1363.sol)

/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}

// lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol

// OpenZeppelin Contracts (last updated v5.7.0) (token/ERC20/utils/SafeERC20.sol)

/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        if (!_safeTransfer(token, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        if (!_safeTransferFrom(token, from, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _safeTransfer(token, to, value, false);
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _safeTransferFrom(token, from, to, value, false);
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        if (!_safeApprove(token, spender, value, false)) {
            if (!_safeApprove(token, spender, 0, true)) revert SafeERC20FailedOperation(address(token));
            if (!_safeApprove(token, spender, value, true)) revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Oppositely, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /// @dev Attempts to fetch the token decimals. A return value of false indicates that the attempt failed in some way.
    function tryGetDecimals(IERC20 token) internal view returns (bool success, uint8 decimals) {
        bytes4 selector = IERC20Metadata.decimals.selector;
        assembly ("memory-safe") {
            mstore(0x00, selector)
            success := staticcall(gas(), token, 0x00, 4, 0x00, 0x20)
            success := and(and(success, gt(returndatasize(), 0x1f)), lt(mload(0x00), 0x100))
            decimals := mul(success, mload(0x00))
        }
    }

    /**
     * @dev Imitates a Solidity `token.transfer(to, value)` call, relaxing the requirement on the return value: the
     * return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransfer(IERC20 token, address to, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.transfer.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(to, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }

    /**
     * @dev Imitates a Solidity `token.transferFrom(from, to, value)` call, relaxing the requirement on the return
     * value: the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param from The sender of the tokens
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value,
        bool bubble
    ) private returns (bool success) {
        bytes4 selector = IERC20.transferFrom.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(from, shr(96, not(0))))
            mstore(0x24, and(to, shr(96, not(0))))
            mstore(0x44, value)
            success := call(gas(), token, 0, 0x00, 0x64, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
            mstore(0x60, 0)
        }
    }

    /**
     * @dev Imitates a Solidity `token.approve(spender, value)` call, relaxing the requirement on the return value:
     * the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param spender The spender of the tokens
     * @param value The amount of token to approve
     * @param bubble Behavior switch if the approve call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeApprove(IERC20 token, address spender, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.approve.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(spender, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }
}

// src/WIFWorlds.sol

/**
 * @title WIFWorlds
 * @notice Persistent multiplayer onchain strategy civilization game on Robinhood Chain powered by $WIF.
 *         Phase 1.1: Includes in-game Resource Economy (Wood, Stone, Food), 6 Structure Types
 *         (Outpost, Workshop, Beacon, Lumber Camp, Quarry, Farm), and 5 Settlement Levels (Lv. 1 - 5).
 */
contract WIFWorlds is Ownable {
    using SafeERC20 for IERC20;

    uint8 public constant GRID_SIZE = 7;
    uint8 public constant TILES_PER_REGION = 49;
    uint8 public constant NUM_REGIONS = 4;
    uint16 public constant TOTAL_WORLD_TILES = 196;
    uint8 public constant MAX_SETTLEMENTS_PER_REGION = 3;
    uint8 public constant MIN_SETTLEMENT_MANHATTAN_DISTANCE = 2;
    uint8 public constant MAX_SETTLEMENT_LEVEL = 5;

    enum TerrainType {
        Plains,   // 0
        Forest,   // 1
        Hills,    // 2
        Water,    // 3
        Rocky,    // 4
        Landmark  // 5
    }

    enum StructureType {
        None,       // 0
        Outpost,    // 1
        Workshop,   // 2
        Beacon,     // 3
        LumberCamp, // 4 - Produces Wood
        Quarry,     // 5 - Produces Stone
        Farm        // 6 - Produces Food
    }

    struct Tile {
        uint16 worldTileId;
        uint8 regionId;
        uint8 terrain;
        address owner;
        uint8 settlementLevel; // 0 = None, 1..5 = Settlement Levels
        uint8 structureType;   // 0 = None, 1..6 = StructureType
        uint32 claimedAt;
    }

    struct PlayerState {
        uint16 tilesClaimed;
        uint16 settlementsBuilt;
        uint16 totalSettlementUpgrades;
        uint16 structuresBuilt;
        uint16 outpostsBuilt;
        uint16 workshopsBuilt;
        uint16 beaconsBuilt;
        uint16 lumberCampsBuilt;
        uint16 quarriesBuilt;
        uint16 farmsBuilt;
        uint16 eventsContributed;
        uint8 maxSettlementLevel;
        uint32 wood;
        uint32 stone;
        uint32 food;
        uint32 woodPerHour;
        uint32 stonePerHour;
        uint32 foodPerHour;
        uint32 lastResourceSync;
        uint256 totalEventWifContributed;
    }

    struct WorldEvent {
        string title;
        uint16 targetWorldTileId;
        uint8 unlocksRegionId; // 255 if none
        uint256 targetAmount;
        uint256 totalContributed;
        uint64 deadline;
        bool completed;
        bool active;
    }

    IERC20 public immutable wifToken;
    address public treasury;
    address public admin;

    modifier onlyAdmin() {
        require(msg.sender == admin || msg.sender == owner(), "Unauthorized: admin only");
        _;
    }

    // 8x tuned $WIF costs
    uint256 public claimCost = 6.25 ether;
    uint256 public settlementSlot1Cost = 25 ether;
    uint256 public settlementSlot2Cost = 43.75 ether;
    uint256 public settlementSlot3Cost = 62.5 ether;

    uint256 public upgradeToLv2Cost = 31.25 ether;
    uint256 public upgradeToLv3Cost = 50 ether;
    uint256 public upgradeToLv4Cost = 75 ether;
    uint256 public upgradeToLv5Cost = 100 ether;

    uint256 public outpostCost = 12.5 ether;
    uint256 public workshopCost = 18.75 ether;
    uint256 public beaconCost = 31.25 ether;
    uint256 public lumberCampCost = 10 ether;
    uint256 public quarryCost = 12.5 ether;
    uint256 public farmCost = 10 ether;

    mapping(uint8 => bool) public isRegionUnlocked;
    mapping(uint16 => Tile) public tiles;
    mapping(address => PlayerState) internal playerStates;

    uint256 public activeEventId = 1;
    mapping(uint256 => WorldEvent) public events;

    // Events
    event TileClaimed(uint256 indexed worldTileId, address indexed player, uint8 regionId, uint256 cost);
    event SettlementBuilt(uint256 indexed worldTileId, address indexed player, uint8 settlementNumber, uint256 cost);
    event SettlementUpgraded(uint256 indexed worldTileId, address indexed player, uint8 newLevel, uint256 cost);
    event StructureBuilt(uint256 indexed worldTileId, address indexed player, uint8 structureType, uint256 cost);
    event ResourcesHarvested(address indexed player, uint32 woodAdded, uint32 stoneAdded, uint32 foodAdded);
    event EventContribution(uint256 indexed eventId, address indexed player, uint256 amount);
    event EventCompleted(uint256 indexed eventId, uint256 totalContributed);
    event RegionUnlocked(uint8 indexed regionId, uint256 indexed triggeredByEventId);
    event EventConfigured(uint256 indexed eventId, string title, uint256 targetAmount, uint8 unlocksRegionId, bool active);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event AdminUpdated(address indexed oldAdmin, address indexed newAdmin);
    event CostsUpdated(uint256 newClaimCost, uint256 newSettlement1Cost);

    constructor(address _wifToken, address _treasury) Ownable(msg.sender) {
        require(_wifToken != address(0), "Invalid token address");
        wifToken = IERC20(_wifToken);
        treasury = _treasury == address(0) ? msg.sender : _treasury;
        admin = treasury;

        // Initialize Region 0 (The Heartlands - tiles 0..48 unlocked at genesis)
        isRegionUnlocked[0] = true;

        // Initialize all 5 World Events onchain
        events[1] = WorldEvent({
            title: "The Great Bridge",
            targetWorldTileId: 3, // (3, 0) Northern Crossing Spire in Region 0
            unlocksRegionId: 1,   // Automatically unlocks Region 1: The Wild Frontier
            targetAmount: 1250 ether,
            totalContributed: 0,
            deadline: 0,
            completed: false,
            active: true
        });
        emit EventConfigured(1, "The Great Bridge", 1250 ether, 1, true);

        events[2] = WorldEvent({
            title: "The Great Harvest",
            targetWorldTileId: 24, // (3, 3) Heartlands Central Sanctuary
            unlocksRegionId: 255,
            targetAmount: 750 ether,
            totalContributed: 0,
            deadline: 0,
            completed: false,
            active: true
        });
        emit EventConfigured(2, "The Great Harvest", 750 ether, 255, true);

        events[3] = WorldEvent({
            title: "The Frontier",
            targetWorldTileId: 73, // (3, 3) Frontier Watch Monolith in Region 1
            unlocksRegionId: 2,    // Automatically unlocks Region 2: The Highlands
            targetAmount: 1000 ether,
            totalContributed: 0,
            deadline: 0,
            completed: false,
            active: true
        });
        emit EventConfigured(3, "The Frontier", 1000 ether, 2, true);

        events[4] = WorldEvent({
            title: "The Forgotten Monument",
            targetWorldTileId: 122, // (3, 3) Skyforge Summit in Region 2
            unlocksRegionId: 255,
            targetAmount: 1250 ether,
            totalContributed: 0,
            deadline: 0,
            completed: false,
            active: true
        });
        emit EventConfigured(4, "The Forgotten Monument", 1250 ether, 255, true);

        events[5] = WorldEvent({
            title: "The Northern Passage",
            targetWorldTileId: 171, // (3, 3) Grand Causeway in Region 3
            unlocksRegionId: 3,     // Automatically unlocks Region 3: The Crossroads
            targetAmount: 1500 ether,
            totalContributed: 0,
            deadline: 0,
            completed: false,
            active: true
        });
        emit EventConfigured(5, "The Northern Passage", 1500 ether, 3, true);

        // Preserve & migrate Genesis pioneer state from 0x567e5362Db7D28E70B6216D78F25FE8Dd7F58E99
        address pioneer = 0x78b7b043921EE70806c66905E31fc2D9E75455a6;
        uint16 pioneerTileId = 31;
        tiles[pioneerTileId] = Tile({
            worldTileId: pioneerTileId,
            regionId: 0,
            terrain: _getTerrain(pioneerTileId),
            owner: pioneer,
            settlementLevel: 0,
            structureType: 0,
            claimedAt: 1793367758
        });
        PlayerState storage pState = playerStates[pioneer];
        pState.tilesClaimed = 1;
        pState.wood = 160;
        pState.stone = 120;
        pState.food = 140;
        pState.woodPerHour = 10;
        pState.stonePerHour = 5;
        pState.foodPerHour = 10;
        pState.lastResourceSync = 1793367758;
        pState.eventsContributed = 1;
        pState.totalEventWifContributed = claimCost;
        events[1].totalContributed = claimCost;

        emit TileClaimed(pioneerTileId, pioneer, 0, claimCost);
        emit EventContribution(1, pioneer, claimCost);
    }

    // ==========================================
    // Core Game Actions
    // ==========================================

    /**
     * @notice Harvest accrued Wood, Stone, and Food from production buildings & settlements.
     */
    function harvestResources() external {
        _syncResources(msg.sender);
    }

    /**
     * @notice Claim a neutral tile in an unlocked region.
     */
    function claimTile(uint256 worldTileId) external {
        require(worldTileId < TOTAL_WORLD_TILES, "Invalid tile ID");
        uint16 id = uint16(worldTileId);
        uint8 regionId = uint8(id / TILES_PER_REGION);
        uint8 terrain = _getTerrain(id);
        Tile storage t = tiles[id];
        require(isRegionUnlocked[regionId], "Region locked");
        require(terrain != uint8(TerrainType.Water), "Water cannot be claimed");
        require(terrain != uint8(TerrainType.Landmark), "Landmarks cannot be claimed");
        require(t.owner == address(0), "Tile already claimed");

        _syncResources(msg.sender);
        PlayerState storage ps = playerStates[msg.sender];
        require(ps.tilesClaimed < getMaxClaimableTiles(msg.sender), "Territory capacity full");

        // Payment
        _chargeWif(msg.sender, claimCost);

        // Grant starter construction materials on first land claim so the player can begin building
        if (ps.tilesClaimed == 0) {
            ps.wood += 160;
            ps.stone += 120;
            ps.food += 140;
            ps.woodPerHour += 10;
            ps.stonePerHour += 5;
            ps.foodPerHour += 10;
        }

        // State update
        t.worldTileId = id;
        t.regionId = regionId;
        t.terrain = terrain;
        t.owner = msg.sender;
        t.claimedAt = uint32(block.timestamp);
        ps.tilesClaimed += 1;

        emit TileClaimed(worldTileId, msg.sender, regionId, claimCost);
        _recordActiveEventProgress(msg.sender, claimCost, false);
    }

    /**
     * @notice Found a new Settlement Hall (Lv. 1) on an owned tile.
     */
    function buildSettlement(uint256 worldTileId) external {
        require(worldTileId < TOTAL_WORLD_TILES, "Invalid tile ID");
        Tile storage t = tiles[uint16(worldTileId)];
        require(isRegionUnlocked[t.regionId], "Region locked");
        require(t.owner == msg.sender, "Must own tile");
        require(t.settlementLevel == 0, "Settlement already built");

        _syncResources(msg.sender);
        PlayerState storage ps = playerStates[msg.sender];
        uint8 currentSettlements = uint8(ps.settlementsBuilt);

        // Enforce spacing & region limit
        _validateSettlementPlacement(msg.sender, uint16(worldTileId), t.regionId);

        // Enforce progression prerequisites & material costs for expansion settlements
        uint256 cost = getSettlementCostForPlayer(msg.sender);
        if (currentSettlements == 1) {
            require(
                ps.maxSettlementLevel >= 2 && ps.structuresBuilt >= 2 && ps.tilesClaimed >= 3,
                "Requires Lv.2 Stronghold, 2+ structures, 3+ tiles"
            );
            _spendResources(ps, 40, 25, 40);
        } else if (currentSettlements >= 2) {
            require(
                ps.maxSettlementLevel >= 3 && ps.structuresBuilt >= 4 && ps.eventsContributed >= 1,
                "Requires Lv.3 Citadel, 4+ structures, 1+ event contribution"
            );
            _spendResources(ps, 70, 50, 70);
        }

        // Payment
        _chargeWif(msg.sender, cost);

        // State update + settlement supply cache & passive production
        t.settlementLevel = 1;
        ps.settlementsBuilt += 1;
        if (ps.maxSettlementLevel == 0) {
            ps.maxSettlementLevel = 1;
        }
        ps.wood += 40;
        ps.stone += 30;
        ps.food += 40;
        ps.woodPerHour += 20;
        ps.stonePerHour += 10;
        ps.foodPerHour += 20;
        _capResources(msg.sender);

        emit SettlementBuilt(worldTileId, msg.sender, currentSettlements + 1, cost);
        _recordActiveEventProgress(msg.sender, cost, false);
    }

    /**
     * @notice Upgrade an existing Settlement Hall across 5 levels:
     *         Lv.1 -> Lv.2 (More building slots)
     *         Lv.2 -> Lv.3 (Advanced production)
     *         Lv.3 -> Lv.4 (Expansion settlement mastery)
     *         Lv.4 -> Lv.5 (Regional projects leadership)
     */
    function upgradeSettlement(uint256 worldTileId) external {
        require(worldTileId < TOTAL_WORLD_TILES, "Invalid tile ID");
        Tile storage t = tiles[uint16(worldTileId)];
        require(isRegionUnlocked[t.regionId], "Region locked");
        require(t.owner == msg.sender, "Must own tile");
        require(t.settlementLevel > 0, "No settlement on tile");
        require(t.settlementLevel < MAX_SETTLEMENT_LEVEL, "Max settlement tier reached");

        _syncResources(msg.sender);
        PlayerState storage ps = playerStates[msg.sender];
        uint256 cost;
        uint8 nextLevel = t.settlementLevel + 1;

        if (nextLevel == 2) {
            require(ps.tilesClaimed >= 2 && ps.structuresBuilt >= 1, "Requires 2+ tiles and 1+ structure");
            _spendResources(ps, 30, 20, 25);
            cost = upgradeToLv2Cost;
            ps.woodPerHour += 15;
            ps.stonePerHour += 10;
            ps.foodPerHour += 15;
        } else if (nextLevel == 3) {
            require(ps.workshopsBuilt >= 1, "Requires at least 1 Workshop");
            _spendResources(ps, 50, 45, 40);
            cost = upgradeToLv3Cost;
            ps.woodPerHour += 25;
            ps.stonePerHour += 20;
            ps.foodPerHour += 25;
        } else if (nextLevel == 4) {
            require(ps.structuresBuilt >= 3 && ps.tilesClaimed >= 4, "Requires 3+ structures and 4+ tiles");
            _spendResources(ps, 90, 80, 70);
            cost = upgradeToLv4Cost;
            ps.woodPerHour += 35;
            ps.stonePerHour += 30;
            ps.foodPerHour += 35;
        } else {
            require(
                ps.beaconsBuilt >= 1 || ps.eventsContributed >= 1,
                "Requires Signal Beacon or Regional Event contribution"
            );
            _spendResources(ps, 140, 120, 110);
            cost = upgradeToLv5Cost;
            ps.woodPerHour += 50;
            ps.stonePerHour += 45;
            ps.foodPerHour += 50;
        }

        // Payment
        _chargeWif(msg.sender, cost);

        // State update
        t.settlementLevel = nextLevel;
        ps.totalSettlementUpgrades += 1;
        if (nextLevel > ps.maxSettlementLevel) {
            ps.maxSettlementLevel = nextLevel;
        }

        emit SettlementUpgraded(worldTileId, msg.sender, nextLevel, cost);
        _recordActiveEventProgress(msg.sender, cost, false);
    }

    /**
     * @notice Build a specialized or production structure:
     *         1 = Outpost, 2 = Workshop, 3 = Beacon, 4 = LumberCamp, 5 = Quarry, 6 = Farm.
     */
    function buildStructure(uint256 worldTileId, uint8 structureType) external {
        require(worldTileId < TOTAL_WORLD_TILES, "Invalid tile ID");
        require(structureType >= 1 && structureType <= 6, "Invalid structure type");

        Tile storage t = tiles[uint16(worldTileId)];
        require(isRegionUnlocked[t.regionId], "Region locked");
        require(t.owner == msg.sender, "Must own tile");
        require(t.structureType == 0, "Structure already present");

        _syncResources(msg.sender);
        PlayerState storage ps = playerStates[msg.sender];
        uint256 cost;

        if (structureType == uint8(StructureType.Outpost)) {
            _spendResources(ps, 20, 0, 0);
            cost = outpostCost;
            ps.outpostsBuilt += 1;
            ps.woodPerHour += 5;
            ps.foodPerHour += 5;
        } else if (structureType == uint8(StructureType.Workshop)) {
            require(t.terrain != uint8(TerrainType.Rocky), "Rocky terrain unsuitable for Workshop");
            require(_hasSettlementInRegion(msg.sender, t.regionId), "Must have Settlement in region");
            _spendResources(ps, 35, 25, 0);
            cost = workshopCost;
            ps.workshopsBuilt += 1;
            ps.woodPerHour += 15;
            ps.stonePerHour += 15;
        } else if (structureType == uint8(StructureType.Beacon)) {
            bool validElevation = t.terrain == uint8(TerrainType.Hills) ||
                                  t.terrain == uint8(TerrainType.Rocky) ||
                                  t.settlementLevel >= 2;
            require(validElevation, "Requires Hills, Rocky, or Stronghold Lv.2+");
            require(ps.maxSettlementLevel >= 2, "Requires at least 1 Stronghold (Lv.2+)");
            _spendResources(ps, 0, 40, 20);
            cost = beaconCost;
            ps.beaconsBuilt += 1;
            ps.woodPerHour += 10;
            ps.stonePerHour += 10;
            ps.foodPerHour += 10;
        } else if (structureType == uint8(StructureType.LumberCamp)) {
            require(
                t.terrain == uint8(TerrainType.Forest) ||
                t.terrain == uint8(TerrainType.Plains) ||
                t.terrain == uint8(TerrainType.Hills),
                "Lumber Camp requires Forest, Plains, or Hills"
            );
            _spendResources(ps, 0, 0, 15);
            cost = lumberCampCost;
            ps.lumberCampsBuilt += 1;
            uint32 yield = t.terrain == uint8(TerrainType.Forest) ? 45 : 30;
            ps.woodPerHour += yield;
            ps.wood += 25; // Immediate timber felled bonus
        } else if (structureType == uint8(StructureType.Quarry)) {
            require(
                t.terrain == uint8(TerrainType.Rocky) ||
                t.terrain == uint8(TerrainType.Hills) ||
                t.terrain == uint8(TerrainType.Plains),
                "Quarry requires Rocky, Hills, or Plains"
            );
            _spendResources(ps, 20, 0, 0);
            cost = quarryCost;
            ps.quarriesBuilt += 1;
            uint32 yield = (t.terrain == uint8(TerrainType.Rocky) || t.terrain == uint8(TerrainType.Hills)) ? 40 : 25;
            ps.stonePerHour += yield;
            ps.stone += 20; // Immediate stone excavated bonus
        } else if (structureType == uint8(StructureType.Farm)) {
            require(
                t.terrain == uint8(TerrainType.Plains) ||
                t.terrain == uint8(TerrainType.Forest) ||
                t.terrain == uint8(TerrainType.Hills),
                "Farm requires Plains, Forest, or Hills"
            );
            _spendResources(ps, 15, 0, 0);
            cost = farmCost;
            ps.farmsBuilt += 1;
            uint32 yield = t.terrain == uint8(TerrainType.Plains) ? 45 : 30;
            ps.foodPerHour += yield;
            ps.food += 25; // Immediate harvest bonus
        }

        // Payment
        _chargeWif(msg.sender, cost);

        // State update
        t.structureType = structureType;
        ps.structuresBuilt += 1;
        _capResources(msg.sender);

        emit StructureBuilt(worldTileId, msg.sender, structureType, cost);
        _recordActiveEventProgress(msg.sender, cost, false);
    }

    /**
     * @notice Contribute $WIF toward a shared world event.
     */
    function contributeToEvent(uint256 eventId, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        WorldEvent storage ev = events[eventId];
        require(ev.active, "Event inactive");
        require(!ev.completed, "Event already completed");
        if (ev.deadline > 0) {
            require(block.timestamp <= ev.deadline, "Event deadline passed");
        }

        _syncResources(msg.sender);

        // Payment
        _chargeWif(msg.sender, amount);

        // State update
        _applyEventProgress(eventId, msg.sender, amount, true);
    }

    // ==========================================
    // View Functions
    // ==========================================

    function getRegionMap(uint8 regionId) external view returns (Tile[49] memory out) {
        require(regionId < NUM_REGIONS, "Invalid region ID");
        uint16 base = uint16(regionId) * TILES_PER_REGION;
        for (uint16 i = 0; i < 49; i++) {
            out[i] = _readTile(base + i);
        }
    }

    function getTile(uint256 worldTileId) external view returns (Tile memory) {
        require(worldTileId < TOTAL_WORLD_TILES, "Invalid tile ID");
        return _readTile(uint16(worldTileId));
    }

    function getPlayerState(address player) external view returns (PlayerState memory) {
        PlayerState memory ps = playerStates[player];
        (uint32 w, uint32 s, uint32 f, ) = getPendingResources(player);
        ps.wood = w;
        ps.stone = s;
        ps.food = f;
        return ps;
    }

    function getResourceStorageCap(address player) public view returns (uint32) {
        PlayerState memory ps = playerStates[player];
        return uint32(
            300 +
            (uint32(ps.settlementsBuilt) * 200) +
            (uint32(ps.totalSettlementUpgrades) * 150) +
            (uint32(ps.workshopsBuilt) * 150)
        );
    }

    function getPendingResources(address player) public view returns (
        uint32 wood,
        uint32 stone,
        uint32 food,
        uint32 storageCap
    ) {
        PlayerState memory ps = playerStates[player];
        storageCap = getResourceStorageCap(player);
        wood = ps.wood;
        stone = ps.stone;
        food = ps.food;

        if (ps.lastResourceSync > 0 && block.timestamp > ps.lastResourceSync) {
            uint256 elapsed = block.timestamp - ps.lastResourceSync;
            uint32 addW = uint32((elapsed * uint256(ps.woodPerHour)) / 3600);
            uint32 addS = uint32((elapsed * uint256(ps.stonePerHour)) / 3600);
            uint32 addF = uint32((elapsed * uint256(ps.foodPerHour)) / 3600);

            wood = wood + addW > storageCap ? storageCap : wood + addW;
            stone = stone + addS > storageCap ? storageCap : stone + addS;
            food = food + addF > storageCap ? storageCap : food + addF;
        }
    }

    function getMaxClaimableTiles(address player) public view returns (uint256) {
        PlayerState memory ps = playerStates[player];
        return 3 + (uint256(ps.settlementsBuilt) * 3) +
                   (uint256(ps.totalSettlementUpgrades) * 2) +
                   (uint256(ps.outpostsBuilt) * 2);
    }

    function getSettlementCostForPlayer(address player) public view returns (uint256) {
        uint16 count = playerStates[player].settlementsBuilt;
        if (count == 0) return settlementSlot1Cost;
        if (count == 1) return settlementSlot2Cost;
        return settlementSlot3Cost;
    }

    function structureCost(uint8 stType) external view returns (uint256) {
        if (stType == uint8(StructureType.Outpost)) return outpostCost;
        if (stType == uint8(StructureType.Workshop)) return workshopCost;
        if (stType == uint8(StructureType.Beacon)) return beaconCost;
        if (stType == uint8(StructureType.LumberCamp)) return lumberCampCost;
        if (stType == uint8(StructureType.Quarry)) return quarryCost;
        if (stType == uint8(StructureType.Farm)) return farmCost;
        revert("Invalid structure type");
    }

    function getEvent(uint256 eventId) external view returns (
        string memory title,
        uint16 targetWorldTileId,
        uint8 unlocksRegionId,
        uint256 targetAmount,
        uint256 totalContributed,
        uint64 deadline,
        bool completed,
        bool active
    ) {
        WorldEvent memory ev = events[eventId];
        return (
            ev.title,
            ev.targetWorldTileId,
            ev.unlocksRegionId,
            ev.targetAmount,
            ev.totalContributed,
            ev.deadline,
            ev.completed,
            ev.active
        );
    }

    // ==========================================
    // Administration (Protected by onlyAdmin)
    // ==========================================

    function setAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin address");
        address old = admin;
        admin = _newAdmin;
        emit AdminUpdated(old, _newAdmin);
    }

    function setTreasury(address _newTreasury) external onlyAdmin {
        require(_newTreasury != address(0), "Invalid treasury address");
        address old = treasury;
        treasury = _newTreasury;
        emit TreasuryUpdated(old, _newTreasury);
    }

    function configureEvent(
        uint256 eventId,
        string calldata title,
        uint16 targetWorldTileId,
        uint8 unlocksRegionId,
        uint256 targetAmount,
        uint64 deadline,
        bool active,
        bool setAsActiveEvent
    ) external onlyAdmin {
        require(eventId > 0, "Invalid event ID");
        require(targetAmount > 0, "Target must be > 0");
        WorldEvent storage ev = events[eventId];
        ev.title = title;
        ev.targetWorldTileId = targetWorldTileId;
        ev.unlocksRegionId = unlocksRegionId;
        ev.targetAmount = targetAmount;
        ev.deadline = deadline;
        ev.active = active;
        if (setAsActiveEvent) {
            activeEventId = eventId;
        }
        emit EventConfigured(eventId, title, targetAmount, unlocksRegionId, active);
    }

    function setRegionUnlocked(uint8 regionId, bool unlocked) external onlyAdmin {
        isRegionUnlocked[regionId] = unlocked;
        if (unlocked) {
            emit RegionUnlocked(regionId, activeEventId);
        }
    }

    function setCosts(
        uint256 _claim,
        uint256 _settlement1,
        uint256 _settlement2,
        uint256 _settlement3,
        uint256 _up2,
        uint256 _up3,
        uint256 _outpost,
        uint256 _workshop,
        uint256 _beacon
    ) external onlyAdmin {
        claimCost = _claim;
        settlementSlot1Cost = _settlement1;
        settlementSlot2Cost = _settlement2;
        settlementSlot3Cost = _settlement3;
        upgradeToLv2Cost = _up2;
        upgradeToLv3Cost = _up3;
        outpostCost = _outpost;
        workshopCost = _workshop;
        beaconCost = _beacon;
        emit CostsUpdated(_claim, _settlement1);
    }

    // ==========================================
    // Internal Helpers
    // ==========================================

    function _syncResources(address player) internal {
        PlayerState storage ps = playerStates[player];
        uint32 cap = getResourceStorageCap(player);
        if (ps.lastResourceSync > 0 && block.timestamp > ps.lastResourceSync) {
            uint256 elapsed = block.timestamp - ps.lastResourceSync;
            uint32 addW = uint32((elapsed * uint256(ps.woodPerHour)) / 3600);
            uint32 addS = uint32((elapsed * uint256(ps.stonePerHour)) / 3600);
            uint32 addF = uint32((elapsed * uint256(ps.foodPerHour)) / 3600);

            if (addW > 0 || addS > 0 || addF > 0) {
                ps.wood = ps.wood + addW > cap ? cap : ps.wood + addW;
                ps.stone = ps.stone + addS > cap ? cap : ps.stone + addS;
                ps.food = ps.food + addF > cap ? cap : ps.food + addF;
                emit ResourcesHarvested(player, addW, addS, addF);
            }
        }
        ps.lastResourceSync = uint32(block.timestamp);
    }

    function _capResources(address player) internal {
        PlayerState storage ps = playerStates[player];
        uint32 cap = getResourceStorageCap(player);
        if (ps.wood > cap) ps.wood = cap;
        if (ps.stone > cap) ps.stone = cap;
        if (ps.food > cap) ps.food = cap;
    }

    function _spendResources(
        PlayerState storage ps,
        uint32 woodReq,
        uint32 stoneReq,
        uint32 foodReq
    ) internal {
        require(ps.wood >= woodReq, "Insufficient Wood");
        require(ps.stone >= stoneReq, "Insufficient Stone");
        require(ps.food >= foodReq, "Insufficient Food");
        ps.wood -= woodReq;
        ps.stone -= stoneReq;
        ps.food -= foodReq;
    }

    function _chargeWif(address from, uint256 amount) internal {
        wifToken.safeTransferFrom(from, treasury, amount);
    }

    function _recordActiveEventProgress(address player, uint256 amount, bool isDirectContribution) internal {
        uint256 evId = activeEventId;
        if (evId == 0) return;
        WorldEvent storage ev = events[evId];
        if (!ev.active || ev.completed) return;
        _applyEventProgress(evId, player, amount, isDirectContribution);
    }

    function _applyEventProgress(
        uint256 eventId,
        address player,
        uint256 amount,
        bool isDirectContribution
    ) internal {
        WorldEvent storage ev = events[eventId];
        ev.totalContributed += amount;
        PlayerState storage ps = playerStates[player];
        if (isDirectContribution || ps.eventsContributed == 0) {
            ps.eventsContributed += 1;
        }
        ps.totalEventWifContributed += amount;

        emit EventContribution(eventId, player, amount);

        // Check completion trigger & auto-advance to next event
        if (ev.totalContributed >= ev.targetAmount && !ev.completed) {
            ev.completed = true;
            emit EventCompleted(eventId, ev.totalContributed);

            // Automatically unlock target region if configured
            if (ev.unlocksRegionId != 255 && !isRegionUnlocked[ev.unlocksRegionId]) {
                isRegionUnlocked[ev.unlocksRegionId] = true;
                emit RegionUnlocked(ev.unlocksRegionId, eventId);
            }

            // Automatically advance activeEventId to the next uncompleted event (1 -> 2 -> 3 -> 4 -> 5)
            for (uint256 nextId = 1; nextId <= 5; nextId++) {
                if (events[nextId].active && !events[nextId].completed) {
                    activeEventId = nextId;
                    break;
                }
            }
        }
    }

    function _validateSettlementPlacement(address player, uint16 newTileId, uint8 regionId) internal view {
        uint16 base = uint16(regionId) * TILES_PER_REGION;
        uint8 settlementsInRegion = 0;

        uint8 newRow = uint8((newTileId % TILES_PER_REGION) / GRID_SIZE);
        uint8 newCol = uint8((newTileId % TILES_PER_REGION) % GRID_SIZE);

        for (uint16 i = 0; i < 49; i++) {
            Tile memory t = tiles[base + i];
            if (t.owner == player && t.settlementLevel > 0) {
                settlementsInRegion += 1;
                uint8 r = uint8(i / GRID_SIZE);
                uint8 c = uint8(i % GRID_SIZE);
                uint8 dist = (newRow > r ? newRow - r : r - newRow) + (newCol > c ? newCol - c : c - newCol);
                require(dist >= MIN_SETTLEMENT_MANHATTAN_DISTANCE, "Too close to existing settlement");
            }
        }
        require(settlementsInRegion < MAX_SETTLEMENTS_PER_REGION, "Max settlements in region reached");
    }

    function _hasSettlementInRegion(address player, uint8 regionId) internal view returns (bool) {
        uint16 base = uint16(regionId) * TILES_PER_REGION;
        for (uint16 i = 0; i < 49; i++) {
            if (tiles[base + i].owner == player && tiles[base + i].settlementLevel > 0) {
                return true;
            }
        }
        return false;
    }

    function _readTile(uint16 id) internal view returns (Tile memory) {
        Tile memory t = tiles[id];
        t.worldTileId = id;
        t.regionId = uint8(id / TILES_PER_REGION);
        t.terrain = _getTerrain(id);
        return t;
    }

    function _getTerrain(uint16 worldTileId) internal pure returns (uint8) {
        uint8 regionId = uint8(worldTileId / TILES_PER_REGION);
        uint8 localId = uint8(worldTileId % TILES_PER_REGION);
        if (regionId == 0) {
            // Region 0: The Heartlands (0..48)
            bytes memory r0 = hex"03040205020403040100020100020300010002010000020005000203010002010001040201000001020303000104020003";
            return uint8(r0[localId]);
        } else if (regionId == 1) {
            // Region 1: The Wild Frontier (49..97)
            bytes memory r1 = hex"04020104010203020102000204020100040100010303020105020004040100020102010200010400040203040201020003";
            return uint8(r1[localId]);
        } else if (regionId == 2) {
            // Region 2: The Highlands (98..146)
            bytes memory r2 = hex"04040205020404040204020402040201020002010203020005000203020401020104020402000100020403040204020403";
            return uint8(r2[localId]);
        } else {
            // Region 3: The Crossroads (147..195)
            bytes memory r3 = hex"03000105010003000100000001000100020002000105000005000005010002000200010001000000010003000105010003";
            return uint8(r3[localId]);
        }
    }
}

