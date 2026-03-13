import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Solana RPC
  heliusRpcUrl: process.env.HELIUS_RPC_URL || '',
  jitoRpcUrl: process.env.JITO_RPC_URL || 'https://mainnet.block-engine.jito.wtf',
  
  // Yellowstone gRPC
  yellowstoneGrpcUrl: process.env.YELLOWSTONE_GRPC_URL || 'grpc://localhost:10000',
  
  // Wallet
  privateKey: process.env.PRIVATE_KEY || '',
  
  // Trading parameters
  slippageBps: parseInt(process.env.SLIPPAGE_BPS || '500'), // 5% default
  maxBuyAmountSol: parseFloat(process.env.MAX_BUY_AMOUNT_SOL || '1.0'),
  minBuyAmountSol: parseFloat(process.env.MIN_BUY_AMOUNT_SOL || '0.1'),
  
  // Stop loss and take profit (in percentage)
  stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT || '10'), // 10% stop loss
  takeProfitPercent: parseFloat(process.env.TAKE_PROFIT_PERCENT || '50'), // 50% take profit
  
  // Bagsapp DEX
  bagsappProgramId: process.env.BAGSAPP_PROGRAM_ID || 'Bagapp111111111111111111111111111111111',
  
  // Monitoring
  checkIntervalMs: parseInt(process.env.CHECK_INTERVAL_MS || '1000'),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validate required config
if (!config.heliusRpcUrl) {
  throw new Error('HELIUS_RPC_URL is required');
}

if (!config.privateKey) {
  throw new Error('PRIVATE_KEY is required');
}
