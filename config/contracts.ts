export const NFT_MARKETPLACE_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const NFT_COLLECTION_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

// Define struct types for better type checking
export interface MarketItem {
  marketItemId: number;
  nftContractAddress: string;
  tokenId: number;
  creator: string;
  seller: string;
  owner: string;
  price: bigint;
  sold: boolean;
  canceled: boolean;
}

export const NFT_MARKETPLACE_ABI = [
  {
    name: "createMarketItem",
    type: "function",
    inputs: [
      { name: "nftContractAddress", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" }
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "payable"
  },
  {
    name: "createMarketSale",
    type: "function",
    inputs: [
      { name: "nftContractAddress", type: "address" },
      { name: "marketItemId", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    name: "cancelMarketItem",
    type: "function",
    inputs: [
      { name: "nftContractAddress", type: "address" },
      { name: "marketItemId", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    name: "getLatestMarketItemByTokenId",
    type: "function",
    inputs: [
      { name: "tokenId", type: "uint256" }
    ],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "marketItemId", type: "uint256" },
          { name: "nftContractAddress", type: "address" },
          { name: "tokenId", type: "uint256" },
          { name: "creator", type: "address" },
          { name: "seller", type: "address" },
          { name: "owner", type: "address" },
          { name: "price", type: "uint256" },
          { name: "sold", type: "bool" },
          { name: "canceled", type: "bool" }
        ]
      },
      { name: "", type: "bool" }
    ],
    stateMutability: "view"
  },
  {
    name: "fetchAvailableMarketItems",
    type: "function",
    inputs: [],
    outputs: [
      { 
        type: "tuple[]",
        components: [
          { name: "marketItemId", type: "uint256" },
          { name: "nftContractAddress", type: "address" },
          { name: "tokenId", type: "uint256" },
          { name: "creator", type: "address" },
          { name: "seller", type: "address" },
          { name: "owner", type: "address" },
          { name: "price", type: "uint256" },
          { name: "sold", type: "bool" },
          { name: "canceled", type: "bool" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    name: "fetchSellingMarketItems",
    type: "function",
    inputs: [],
    outputs: [
      { 
        type: "tuple[]",
        components: [
          { name: "marketItemId", type: "uint256" },
          { name: "nftContractAddress", type: "address" },
          { name: "tokenId", type: "uint256" },
          { name: "creator", type: "address" },
          { name: "seller", type: "address" },
          { name: "owner", type: "address" },
          { name: "price", type: "uint256" },
          { name: "sold", type: "bool" },
          { name: "canceled", type: "bool" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    name: "fetchOwnedMarketItems",
    type: "function",
    inputs: [],
    outputs: [
      { 
        type: "tuple[]",
        components: [
          { name: "marketItemId", type: "uint256" },
          { name: "nftContractAddress", type: "address" },
          { name: "tokenId", type: "uint256" },
          { name: "creator", type: "address" },
          { name: "seller", type: "address" },
          { name: "owner", type: "address" },
          { name: "price", type: "uint256" },
          { name: "sold", type: "bool" },
          { name: "canceled", type: "bool" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    name: "getListingFee",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  }
];

export const NFT_COLLECTION_ABI = [
  {
    name: "mintToken",
    type: "function",
    inputs: [{ name: "tokenURI", type: "string" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable"
  },
  {
    name: "tokenURI",
    type: "function",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view"
  },
  {
    name: "ownerOf",
    type: "function",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view"
  },
  {
    name: "transferFrom",
    type: "function",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    name: "setApprovalForAll",
    type: "function",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    name: "getTokenCreatorById",
    type: "function",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view"
  },
  {
    name: "getTokensOwnedByMe",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view"
  },
  {
    name: "getTokensCreatedByMe",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view"
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  }
];