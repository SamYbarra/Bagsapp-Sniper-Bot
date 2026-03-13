import { Connection } from '@solana/web3.js';
import { config } from './config';
import { logger } from './utils/logger';
import { HeliusClient } from './clients/helius';
import { JitoClient } from './clients/jito';
import { YellowstoneClient } from './clients/yellowstone';
import { BagsappService } from './services/bagsapp';
import { TradingService } from './services/trading';

class SniperBot {
  private heliusClient: HeliusClient;
  private jitoClient: JitoClient;
  private yellowstoneClient: YellowstoneClient;
  private bagsappService: BagsappService;
  private tradingService: TradingService;
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize clients
    this.heliusClient = new HeliusClient();
    const connection = this.heliusClient.getConnection();
    this.jitoClient = new JitoClient(connection);
    this.yellowstoneClient = new YellowstoneClient();

    // Initialize services
    this.bagsappService = new BagsappService(connection);
    this.tradingService = new TradingService(
      this.bagsappService,
      this.heliusClient,
      this.jitoClient
    );
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Bot is already running');
      return;
    }

    logger.info('Starting Bagsapp Sniper Bot...');
    logger.info(`Wallet: ${this.tradingService.getWalletPublicKey().toString()}`);
    logger.info(`Stop Loss: ${config.stopLossPercent}%`);
    logger.info(`Take Profit: ${config.takeProfitPercent}%`);
    logger.info(`Max Buy Amount: ${config.maxBuyAmountSol} SOL`);

    this.isRunning = true;

    try {
      // Connect to Yellowstone gRPC
      await this.yellowstoneClient.connect();

      // Subscribe to transactions for bagsapp program
      await this.yellowstoneClient.subscribeToTransactions(
        config.bagsappProgramId,
        async (transaction: any) => {
          try {
            // Detect new pool creation
            const poolInfo = await this.bagsappService.detectNewPool(transaction);
            if (poolInfo) {
              logger.info(`New pool detected: ${poolInfo.poolAddress.toString()}`);
              
              // Execute buy immediately
              const buySignature = await this.tradingService.buy(poolInfo);
              if (buySignature) {
                logger.info(`Buy executed: ${buySignature}`);
              } else {
                logger.error('Buy execution failed');
              }
            }
          } catch (error) {
            logger.error('Error processing transaction:', error);
          }
        }
      );

      // Start position monitoring loop
      this.checkInterval = setInterval(async () => {
        try {
          await this.tradingService.checkPositions();
        } catch (error) {
          logger.error('Error in position check loop:', error);
        }
      }, config.checkIntervalMs);

      logger.info('Bot started successfully');
    } catch (error) {
      logger.error('Error starting bot:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping bot...');
    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    await this.yellowstoneClient.disconnect();
    logger.info('Bot stopped');
  }

  getStatus(): {
    isRunning: boolean;
    positions: number;
  } {
    return {
      isRunning: this.isRunning,
      positions: this.tradingService.getPositions().size,
    };
  }
}

// Main execution
async function main() {
  const bot = new SniperBot();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
  });

  try {
    await bot.start();
  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { SniperBot };
