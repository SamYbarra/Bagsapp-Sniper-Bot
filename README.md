# Bagsapp Sniper Bot

A high-performance Solana sniper bot for the Bagsapp (bags.fm) DEX that automatically buys tokens when new liquidity pools are created and manages positions with stop loss and take profit.

## Features

- 🚀 **Instant Pool Detection**: Monitors new liquidity pool creation on bags.fm using Yellowstone gRPC streaming
- 💰 **Automated Trading**: Automatically buys tokens when new pools are detected
- 📊 **Risk Management**: Built-in stop loss and take profit mechanisms
- ⚡ **Fast Execution**: Uses Jito for transaction confirmation and Helius RPC for blockhash retrieval
- 🔒 **Secure**: Private key management and transaction signing

## Architecture

- **Yellowstone gRPC**: Real-time transaction streaming for pool detection
- **Helius RPC**: Fast blockhash retrieval
- **Jito**: Transaction confirmation and priority execution
- **TypeScript**: Type-safe implementation

## Prerequisites

- Node.js 18+ and npm/yarn
- Solana wallet with SOL for trading
- Helius API key (for RPC access)
- Yellowstone gRPC endpoint (or self-hosted)
- Jito RPC access (optional, defaults to public endpoint)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Bagsapp-Sniper-Bot
```

2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

4. Edit `.env` with your configuration:
- `HELIUS_RPC_URL`: Your Helius RPC endpoint
- `PRIVATE_KEY`: Your wallet's base58-encoded private key
- `BAGSAPP_PROGRAM_ID`: The actual Bagsapp program ID (update when available)
- Adjust trading parameters as needed

## Configuration

### Required Environment Variables

- `HELIUS_RPC_URL`: Helius RPC endpoint URL
- `PRIVATE_KEY`: Base58-encoded wallet private key

### Optional Environment Variables

- `JITO_RPC_URL`: Jito RPC endpoint (defaults to mainnet)
- `YELLOWSTONE_GRPC_URL`: Yellowstone gRPC endpoint (defaults to localhost)
- `BAGSAPP_PROGRAM_ID`: Bagsapp program ID
- `SLIPPAGE_BPS`: Slippage in basis points (default: 500 = 5%)
- `MAX_BUY_AMOUNT_SOL`: Maximum buy amount in SOL (default: 1.0)
- `MIN_BUY_AMOUNT_SOL`: Minimum buy amount in SOL (default: 0.1)
- `STOP_LOSS_PERCENT`: Stop loss percentage (default: 10%)
- `TAKE_PROFIT_PERCENT`: Take profit percentage (default: 50%)
- `CHECK_INTERVAL_MS`: Position check interval in milliseconds (default: 1000)
- `LOG_LEVEL`: Logging level (default: info)

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

1. Build the project:
```bash
npm run build
```

2. Run the bot:
```bash
npm start
```

## How It Works

1. **Pool Detection**: The bot connects to Yellowstone gRPC and monitors transactions involving the Bagsapp program
2. **Buy Execution**: When a new pool is detected, the bot immediately creates and executes a buy transaction
3. **Position Monitoring**: The bot continuously monitors open positions for stop loss and take profit conditions
4. **Sell Execution**: When conditions are met, the bot automatically sells the position

## Important Notes

⚠️ **This bot requires integration with actual services and program interfaces to function properly**. The current implementation includes placeholder code that needs to be updated with:

### Required Integrations:

1. **Bagsapp Program IDL**: 
   - Update `BAGSAPP_PROGRAM_ID` in `.env` with the real program ID
   - Implement instruction parsing in `src/services/bagsapp.ts` based on the program's IDL
   - Complete `parsePoolCreationInstruction()` method to detect new pools
   - Implement `createBuyTransaction()` and `createSellTransaction()` with actual program instructions

2. **Yellowstone gRPC**:
   - The Yellowstone client in `src/clients/yellowstone.ts` is a skeleton implementation
   - You'll need to integrate with the actual Yellowstone gRPC client library
   - Update the connection and subscription methods based on your Yellowstone setup
   - Alternative: Use WebSocket subscriptions or other real-time data sources

3. **Jito Integration**:
   - The Jito client uses the block engine API
   - You may need to adjust the API endpoint based on your Jito setup
   - Consider adding tip payments for priority transaction inclusion

4. **Pool Detection**:
   - Update pool detection logic in `BagsappService.detectNewPool()` based on actual transaction structure
   - Implement proper account data parsing for pool information
   - Add validation for pool liquidity and other safety checks

## Security

- **Never commit your `.env` file** - it contains sensitive private keys
- Use a dedicated trading wallet with limited funds
- Test thoroughly on devnet before using on mainnet
- Monitor your positions regularly

## Troubleshooting

### Connection Issues

- Verify your Helius RPC URL is correct and accessible
- Check Yellowstone gRPC endpoint connectivity
- Ensure your network allows gRPC connections

### Transaction Failures

- Verify you have sufficient SOL for fees and trading
- Check slippage settings
- Ensure the pool has sufficient liquidity

### Pool Detection Issues

- Verify the Bagsapp program ID is correct
- Check Yellowstone stream is receiving transactions
- Review logs for parsing errors

## Development

### Project Structure

```
src/
├── clients/          # External service clients
│   ├── helius.ts     # Helius RPC client
│   ├── jito.ts       # Jito transaction client
│   └── yellowstone.ts # Yellowstone gRPC client
├── services/         # Business logic
│   ├── bagsapp.ts    # Bagsapp DEX integration
│   └── trading.ts    # Trading logic
├── config/           # Configuration
│   └── index.ts      # Config loader
├── utils/            # Utilities
│   └── logger.ts     # Logging
└── index.ts          # Main entry point
```

## License

MIT

## Disclaimer

This software is provided as-is for educational purposes. Trading cryptocurrencies involves substantial risk. Use at your own risk. The authors are not responsible for any financial losses.
