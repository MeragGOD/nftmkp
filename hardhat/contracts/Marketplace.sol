// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./NFT.sol";

/**
 * @title Marketplace
 * @dev A marketplace for buying and selling NFTs
 */
contract Marketplace is ReentrancyGuard {
    // Thay thế Counters bằng uint256
    uint256 private _marketItemIdCounter;
    uint256 private _tokensSoldCounter;
    uint256 private _tokensCanceledCounter;

    address payable private immutable owner;

    // Challenge: make this price dynamic according to the current currency price
    uint256 private listingFee = 0.045 ether;

    mapping(uint256 => MarketItem) private marketItemIdToMarketItem;

    struct MarketItem {
        uint256 marketItemId;
        address nftContractAddress;
        uint256 tokenId;
        address payable creator;
        address payable seller;
        address payable owner;
        uint256 price;
        bool sold;
        bool canceled;
    }

    event MarketItemCreated(
        uint256 indexed marketItemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address creator,
        address seller,
        address owner,
        uint256 price,
        bool sold,
        bool canceled
    );

    event MarketItemSold(
        uint256 indexed marketItemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 price
    );

    event MarketItemCanceled(
        uint256 indexed marketItemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller
    );

    constructor() {
        owner = payable(msg.sender);
    }

    /**
     * @dev Returns the current listing fee
     * @return The listing fee amount
     */
    function getListingFee() public view returns (uint256) {
        return listingFee;
    }

    /**
     * @dev Creates a market item listing, requiring a listing fee and transfering the NFT token from
     * msg.sender to the marketplace contract.
     * @param nftContractAddress The address of the NFT contract
     * @param tokenId The ID of the token to list
     * @param price The price of the listing
     * @return The ID of the newly created market item
     */
    function createMarketItem(
        address nftContractAddress,
        uint256 tokenId,
        uint256 price
    ) public payable nonReentrant returns (uint256) {
        require(price > 0, "Price must be at least 1 wei");
        require(msg.value == listingFee, "Price must be equal to listing price");
        
        // Tăng counter và lấy giá trị mới
        uint256 marketItemId = ++_marketItemIdCounter;

        address creator = NFT(nftContractAddress).getTokenCreatorById(tokenId);

        marketItemIdToMarketItem[marketItemId] = MarketItem(
            marketItemId,
            nftContractAddress,
            tokenId,
            payable(creator),
            payable(msg.sender),
            payable(address(0)),
            price,
            false,
            false
        );

        IERC721(nftContractAddress).transferFrom(msg.sender, address(this), tokenId);

        emit MarketItemCreated(
            marketItemId,
            nftContractAddress,
            tokenId,
            creator,
            msg.sender,
            address(0),
            price,
            false,
            false
        );

        return marketItemId;
    }

    /**
     * @dev Cancel a market item and return the NFT to the seller
     * @param nftContractAddress The address of the NFT contract
     * @param marketItemId The ID of the market item to cancel
     */
    function cancelMarketItem(address nftContractAddress, uint256 marketItemId) public nonReentrant {
        uint256 tokenId = marketItemIdToMarketItem[marketItemId].tokenId;
        require(tokenId > 0, "Market item has to exist");

        require(marketItemIdToMarketItem[marketItemId].seller == msg.sender, "You are not the seller");

        IERC721(nftContractAddress).transferFrom(address(this), msg.sender, tokenId);

        marketItemIdToMarketItem[marketItemId].owner = payable(msg.sender);
        marketItemIdToMarketItem[marketItemId].canceled = true;

        _tokensCanceledCounter++;

        emit MarketItemCanceled(marketItemId, nftContractAddress, tokenId, msg.sender);
    }

    /**
     * @dev Get Latest Market Item by the token id
     * @param tokenId The ID of the token to query
     * @return item The market item data and a boolean indicating whether the item was found
     */
    function getLatestMarketItemByTokenId(uint256 tokenId) public view returns (MarketItem memory, bool) {
        uint256 itemsCount = _marketItemIdCounter;

        for (uint256 i = itemsCount; i > 0; i--) {
            MarketItem memory item = marketItemIdToMarketItem[i];
            if (item.tokenId != tokenId) continue;
            return (item, true);
        }

        // Return an empty MarketItem and false if not found
        MarketItem memory emptyMarketItem;
        return (emptyMarketItem, false);
    }

    /**
     * @dev Creates a market sale by transferring msg.sender money to the seller and NFT token from the
     * marketplace to the msg.sender. It also sends the listingFee to the marketplace owner.
     * @param nftContractAddress The address of the NFT contract
     * @param marketItemId The ID of the market item to purchase
     */
    function createMarketSale(address nftContractAddress, uint256 marketItemId) public payable nonReentrant {
        uint256 price = marketItemIdToMarketItem[marketItemId].price;
        uint256 tokenId = marketItemIdToMarketItem[marketItemId].tokenId;
        require(msg.value == price, "Please submit the asking price in order to continue");

        marketItemIdToMarketItem[marketItemId].owner = payable(msg.sender);
        marketItemIdToMarketItem[marketItemId].sold = true;

        marketItemIdToMarketItem[marketItemId].seller.transfer(msg.value);
        IERC721(nftContractAddress).transferFrom(address(this), msg.sender, tokenId);

        _tokensSoldCounter++;

        payable(owner).transfer(listingFee);

        emit MarketItemSold(marketItemId, nftContractAddress, tokenId, marketItemIdToMarketItem[marketItemId].seller, msg.sender, price);
    }

    /**
     * @dev Fetch non-sold and non-canceled market items
     * @return An array of available market items
     */
    function fetchAvailableMarketItems() public view returns (MarketItem[] memory) {
        uint256 itemsCount = _marketItemIdCounter;
        uint256 soldItemsCount = _tokensSoldCounter;
        uint256 canceledItemsCount = _tokensCanceledCounter;
        uint256 availableItemsCount = itemsCount - soldItemsCount - canceledItemsCount;
        MarketItem[] memory marketItems = new MarketItem[](availableItemsCount);

        uint256 currentIndex = 0;
        for (uint256 i = 0; i < itemsCount; i++) {
            MarketItem memory item = marketItemIdToMarketItem[i + 1];
            if (item.owner != address(0)) continue;
            marketItems[currentIndex] = item;
            currentIndex += 1;
        }

        return marketItems;
    }

    /**
     * @dev Compare two strings for equality
     * @param a First string to compare
     * @param b Second string to compare
     * @return Whether the strings are equal
     */
    function compareStrings(string memory a, string memory b) private pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    /**
     * @dev Get a market item's address property based on a string parameter
     * @param item The market item to query
     * @param property The property to retrieve ("seller" or "owner")
     * @return The requested address property
     */
    function getMarketItemAddressByProperty(MarketItem memory item, string memory property)
        private
        pure
        returns (address)
    {
        require(
            compareStrings(property, "seller") || compareStrings(property, "owner"),
            "Parameter must be 'seller' or 'owner'"
        );

        return compareStrings(property, "seller") ? item.seller : item.owner;
    }

    /**
     * @dev Fetch market items that are being listed by the msg.sender
     * @return An array of market items being sold by the caller
     */
    function fetchSellingMarketItems() public view returns (MarketItem[] memory) {
        return fetchMarketItemsByAddressProperty("seller");
    }

    /**
     * @dev Fetch market items that are owned by the msg.sender
     * @return An array of market items owned by the caller
     */
    function fetchOwnedMarketItems() public view returns (MarketItem[] memory) {
        return fetchMarketItemsByAddressProperty("owner");
    }

    /**
     * @dev Fetches market items according to the its requested address property that
     * can be "owner" or "seller".
     * @param _addressProperty The property to filter by ("seller" or "owner")
     * @return An array of filtered market items
     */
    function fetchMarketItemsByAddressProperty(string memory _addressProperty)
        public
        view
        returns (MarketItem[] memory)
    {
        require(
            compareStrings(_addressProperty, "seller") || compareStrings(_addressProperty, "owner"),
            "Parameter must be 'seller' or 'owner'"
        );
        uint256 totalItemsCount = _marketItemIdCounter;
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemsCount; i++) {
            MarketItem storage item = marketItemIdToMarketItem[i + 1];
            address addressPropertyValue = getMarketItemAddressByProperty(item, _addressProperty);
            if (addressPropertyValue != msg.sender) continue;
            itemCount += 1;
        }

        MarketItem[] memory items = new MarketItem[](itemCount);

        for (uint256 i = 0; i < totalItemsCount; i++) {
            MarketItem storage item = marketItemIdToMarketItem[i + 1];
            address addressPropertyValue = getMarketItemAddressByProperty(item, _addressProperty);
            if (addressPropertyValue != msg.sender) continue;
            items[currentIndex] = item;
            currentIndex += 1;
        }

        return items;
    }
} 