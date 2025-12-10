export interface NFT {
  tokenId: string;
  price: string;
  seller: string;
  owner: string;
  image: string;
  name: string;
  description: string;
  category?: string;
  isListed: boolean;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  category?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
} 

export interface MarketEvent {
  type: "LISTED" | "SOLD" | "CANCELED";
  marketItemId: string;
  tokenId: string;
  price: string;
  actor: string;
  counterparty?: string;
  txHash: string;
  blockNumber: number;
  timestamp?: number;
}