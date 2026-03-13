import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { config } from '../config';
import { logger } from '../utils/logger';
import { BagsappService, PoolInfo } from './bagsapp';
import { HeliusClient } from '../clients/helius';
import { JitoClient } from '../clients/jito';
import bs58 from 'bs58';

export interface Position {
  poolAddress: PublicKey;
  tokenMint: PublicKey;
  buyPrice: number;
  buyAmountSol: number;
  tokenAmount: number;
  buyTimestamp: number;
}

export class TradingService {
  private bagsappService: BagsappService;
  private heliusClient: HeliusClient;
  private jitoClient: JitoClient;
  private wallet: Keypair;
  private positions: Map<string, Position> = new Map();

  constructor(
    bagsappService: BagsappService,
    heliusClient: HeliusClient,
    jitoClient: JitoClient
  ) {
    this.bagsappService = bagsappService;
    this.heliusClient = heliusClient;
    this.jitoClient = jitoClient;
    
    // Initialize wallet from private key
    const privateKey = config.privateKey;
    if (!privateKey) {
      throw new Error('Private key not configured');
    }
    
    try {
      const privateKeyBytes = bs58.decode(privateKey);
      this.wallet = Keypair.fromSecretKey(privateKeyBytes);
      logger.info(`Wallet initialized: ${this.wallet.publicKey.toString()}`);
    } catch (error) {
      logger.error('Error initializing wallet:', error);
      throw error;
    }
  }

  /**
   * Buy tokens from a new pool
   */
  async buy(poolInfo: PoolInfo): Promise<string | null> {
    try {
      const poolKey = poolInfo.poolAddress.toString();
      
      // Check if we already have a position
      if (this.positions.has(poolKey)) {
        logger.warn(`Already have position in pool: ${poolKey}`);
        return null;
      }

      // Determine buy amount
      const buyAmountSol = Math.min(
        config.maxBuyAmountSol,
        Math.max(config.minBuyAmountSol, config.maxBuyAmountSol)
      );

      logger.info(`Buying ${buyAmountSol} SOL worth of tokens from pool: ${poolKey}`);

      // Get latest blockhash
      const blockhash = await this.heliusClient.getLatestBlockhash();

      // Create buy transaction
      const transaction = await this.bagsappService.createBuyTransaction(
        poolInfo,
        buyAmountSol,
        this.wallet,
        blockhash.blockhash
      );

      // Sign transaction
      transaction.sign(this.wallet);

      // Send via Jito for fast confirmation
      const signature = await this.jitoClient.sendTransaction(transaction);

      // Get current price
      const buyPrice = await this.bagsappService.getTokenPrice(poolInfo);

      // Record position
      const position: Position = {
        poolAddress: poolInfo.poolAddress,
        tokenMint: poolInfo.tokenMint,
        buyPrice,
        buyAmountSol,
        tokenAmount: 0, // Would need to calculate from transaction result
        buyTimestamp: Date.now(),
      };

      this.positions.set(poolKey, position);
      logger.info(`Position opened: ${poolKey} at price ${buyPrice}`);

      return signature;
    } catch (error) {
      logger.error('Error executing buy:', error);
      return null;
    }
  }

  /**
   * Sell tokens from a position
   */
  async sell(poolKey: string): Promise<string | null> {
    try {
      const position = this.positions.get(poolKey);
      if (!position) {
        logger.warn(`No position found for pool: ${poolKey}`);
        return null;
      }

      logger.info(`Selling position: ${poolKey}`);

      // Get pool info
      const poolInfo = await this.bagsappService.getPoolInfo(position.poolAddress);
      if (!poolInfo) {
        logger.error(`Could not get pool info for: ${poolKey}`);
        return null;
      }

      // Get latest blockhash
      const blockhash = await this.heliusClient.getLatestBlockhash();

      // Create sell transaction
      const transaction = await this.bagsappService.createSellTransaction(
        poolInfo,
        position.tokenAmount,
        this.wallet,
        blockhash.blockhash
      );

      // Sign transaction
      transaction.sign(this.wallet);

      // Send via Jito
      const signature = await this.jitoClient.sendTransaction(transaction);

      // Remove position
      this.positions.delete(poolKey);
      logger.info(`Position closed: ${poolKey}`);

      return signature;
    } catch (error) {
      logger.error('Error executing sell:', error);
      return null;
    }
  }

  /**
   * Check positions for stop loss and take profit
   */
  async checkPositions(): Promise<void> {
    for (const [poolKey, position] of this.positions.entries()) {
      try {
        const poolInfo = await this.bagsappService.getPoolInfo(position.poolAddress);
        if (!poolInfo) {
          logger.warn(`Could not get pool info for position: ${poolKey}`);
          continue;
        }

        const currentPrice = await this.bagsappService.getTokenPrice(poolInfo);
        const priceChangePercent = ((currentPrice - position.buyPrice) / position.buyPrice) * 100;

        logger.debug(
          `Position ${poolKey}: Buy ${position.buyPrice}, Current ${currentPrice}, Change ${priceChangePercent.toFixed(2)}%`
        );

        // Check stop loss
        if (priceChangePercent <= -config.stopLossPercent) {
          logger.info(
            `Stop loss triggered for ${poolKey}: ${priceChangePercent.toFixed(2)}% <= -${config.stopLossPercent}%`
          );
          await this.sell(poolKey);
          continue;
        }

        // Check take profit
        if (priceChangePercent >= config.takeProfitPercent) {
          logger.info(
            `Take profit triggered for ${poolKey}: ${priceChangePercent.toFixed(2)}% >= ${config.takeProfitPercent}%`
          );
          await this.sell(poolKey);
          continue;
        }
      } catch (error) {
        logger.error(`Error checking position ${poolKey}:`, error);
      }
    }
  }

  /**
   * Get all active positions
   */
  getPositions(): Map<string, Position> {
    return this.positions;
  }

  /**
   * Get wallet public key
   */
  getWalletPublicKey(): PublicKey {
    return this.wallet.publicKey;
  }
}
