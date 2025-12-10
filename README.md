# NFT Marketplace

A modern, responsive NFT marketplace built with Next.js, TypeScript, shadcn UI components, and Ethereum blockchain integration.

## Features

- 🖼️ Browse, create, buy, and sell NFTs
- 👛 Connect your Ethereum wallet (MetaMask, etc.)
- 💸 List your NFTs for sale with custom pricing
- 🔍 View detailed NFT information with expandable cards
- 👤 Interactive user profile menu with account statistics
- 🔄 Real-time marketplace updates with transaction history
- 🏷️ NFT categorization and filtering by category
- 🔎 Advanced search functionality for discovering NFTs
- 📊 Smart sorting options (recent, price ascending/descending)
- 💾 Local caching with localStorage for improved performance
- 📝 IPFS integration for decentralized file storage
- 🎨 NFT metadata upload with custom category support
- 🔗 Track transaction history and marketplace activities
- ⚡ Batch metadata loading for optimized performance

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS
- **UI Components**: shadcn UI (Radix UI), Motion library for animations
- **Blockchain**: Ethereum (via ethers.js v6)
- **Smart Contracts**: Solidity 0.8.28, Hardhat, OpenZeppelin
- **Storage**: IPFS integration for decentralized file storage
- **Internationalization**: Multi-language support (Locale Provider)
- **State Management**: React Hooks with Web3Provider

## Prerequisites

- Node.js (v16+)
- npm or yarn
- MetaMask or other Ethereum wallet browser extension

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd my-nft-marketplace
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Set up the smart contracts (optional if deploying new contracts)

```bash
cd hardhat
npm install
npx hardhat compile
```

### 4. Start the development server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Smart Contract Deployment

The application requires NFT and Marketplace contracts to be deployed. To deploy new contracts:

```bash
cd hardhat
npx hardhat run scripts/deploy.ts --network localhost
```

For testing purposes, you can run a local Ethereum node:

```bash
npx hardhat node
```

## Usage Guide

### Connecting Your Wallet

1. Click the "Connect Wallet" button in the top right corner
2. Approve the connection in your wallet extension (MetaMask)
3. Once connected, you'll see your account information, balance, and NFT statistics

### Browsing NFTs

1. The home page displays all available NFTs
2. Click on any NFT card to view detailed information
3. Use the search bar to find NFTs by name or description
4. Filter NFTs by category using the category dropdown
5. Sort NFTs by recent, price (low to high), or price (high to low)

### Creating an NFT

1. Navigate to the "Create NFT" page
2. Upload an image for your NFT
3. Fill in the name and description
4. Optionally assign a category to your NFT
5. Click "Create" and approve the transaction in your wallet
6. Your NFT will be minted and stored on IPFS

### Buying an NFT

1. Click on a listed NFT to view details
2. Click the "Buy" button
3. Approve the transaction in your wallet
4. Once confirmed, the NFT will be transferred to your wallet

### Selling an NFT

1. Navigate to "My NFTs" page
2. Click on an NFT you own
3. Enter a price and click "List"
4. Approve the transaction in your wallet
5. Your NFT will now be listed for sale

### Managing Your NFTs

1. Navigate to "My NFTs" page to see all NFTs you own
2. You can list, unlist, or view your NFTs from this page
3. NFTs displayed with all metadata including category information

### Viewing Transaction History

1. Navigate to the "History" page to view your transaction history
2. See all marketplace activities and transaction details
3. Track buying and selling activities in chronological order

## Components

### Core NFT Components

**ExpandableNFTCard**: Interactive card component that displays NFT information and expands to show detailed view with purchase/listing options.

**NFTList**: Component for displaying collections of NFTs with grid layout support.

**NFTUploader**: File upload component with image preview for NFT creation.

### UI & Layout Components

**UserProfileMenu**: User account interface showing wallet address, ETH balance, and NFT statistics. Provides quick access to functions like copying wallet address and viewing on Etherscan.

**MainLayout**: Primary layout wrapper providing navigation and consistent styling across pages.

### Providers

**Web3Provider**: Manages Ethereum wallet connection and blockchain interaction state.

**ThemeProvider**: Handles light/dark theme switching using next-themes.

**LocaleProvider**: Provides internationalization support with multi-language capability.

## Development

### Project Structure

- `/app`: Page components and routes
  - `/api/upload`: API endpoint for file uploads to IPFS
  - `/create`: NFT creation page
  - `/history`: Transaction history page
  - `/my-nfts`: User's NFT collection management
  - `/test`: Testing page
- `/components`: Reusable React components
  - `/nft`: NFT-specific components (cards, lists)
  - `/ui`: shadcn UI component library
  - `/providers`: Context providers (Web3, Theme, Locale)
  - `/layout`: Layout components
- `/hooks`: Custom React hooks for blockchain interaction and utilities
- `/hardhat`: Smart contracts and deployment scripts
  - `/contracts`: Solidity smart contracts (NFT, Marketplace)
  - `/scripts`: Deployment and interaction scripts
  - `/test`: Contract test suites
- `/lib`: Utility functions and helpers
  - `/pinata`: IPFS and file storage utilities
- `/public`: Static assets and uploaded files
- `/types`: TypeScript type definitions
- `/config`: Configuration files for contracts and settings

## License

[MIT License](LICENSE)
