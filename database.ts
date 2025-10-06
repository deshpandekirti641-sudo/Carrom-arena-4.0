/**
 * CARROM ARENA - Database Utility
 * 
 * This utility provides database connection and query helpers
 * that can be adapted for different database systems.
 * 
 * Supports:
 * - PostgreSQL
 * - MongoDB
 * - MySQL
 * - SQLite
 */

import { Pool, PoolClient, QueryResult } from 'pg'; // PostgreSQL
// import mongoose from 'mongoose'; // MongoDB
// import mysql from 'mysql2/promise'; // MySQL

// =============================================================================
// POSTGRESQL CONFIGURATION
// =============================================================================

const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'carromarena',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// =============================================================================
// DATABASE CONNECTION MANAGER
// =============================================================================

export class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: Pool;
  private isConnected: boolean = false;

  private constructor() {
    this.pool = pgPool;
    this.setupEventHandlers();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private setupEventHandlers() {
    this.pool.on('connect', (client: PoolClient) => {
      console.log('🔗 New database connection established');
      this.isConnected = true;
    });

    this.pool.on('error', (err: Error) => {
      console.error('❌ Database connection error:', err);
      this.isConnected = false;
    });

    this.pool.on('remove', () => {
      console.log('📤 Database connection removed from pool');
    });
  }

  public async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      
      console.log('✅ Database connection successful:', result.rows[0]);
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  public getPool(): Pool {
    return this.pool;
  }

  public isHealthy(): boolean {
    return this.isConnected;
  }

  public async close(): Promise<void> {
    await this.pool.end();
    console.log('🔚 Database connections closed');
  }
}

// =============================================================================
// QUERY BUILDER AND UTILITIES
// =============================================================================

export class QueryBuilder {
  private tableName: string = '';
  private selectColumns: string[] = ['*'];
  private whereConditions: string[] = [];
  private joinClauses: string[] = [];
  private orderByClause: string = '';
  private limitClause: string = '';
  private offsetClause: string = '';
  private parameters: any[] = [];

  constructor(table?: string) {
    if (table) {
      this.tableName = table;
    }
  }

  public table(name: string): QueryBuilder {
    this.tableName = name;
    return this;
  }

  public select(columns: string[] | string): QueryBuilder {
    if (typeof columns === 'string') {
      this.selectColumns = [columns];
    } else {
      this.selectColumns = columns;
    }
    return this;
  }

  public where(column: string, operator: string, value: any): QueryBuilder {
    this.parameters.push(value);
    this.whereConditions.push(`${column} ${operator} $${this.parameters.length}`);
    return this;
  }

  public whereIn(column: string, values: any[]): QueryBuilder {
    const placeholders = values.map((_, index) => `$${this.parameters.length + index + 1}`).join(', ');
    this.parameters.push(...values);
    this.whereConditions.push(`${column} IN (${placeholders})`);
    return this;
  }

  public join(table: string, condition: string): QueryBuilder {
    this.joinClauses.push(`JOIN ${table} ON ${condition}`);
    return this;
  }

  public leftJoin(table: string, condition: string): QueryBuilder {
    this.joinClauses.push(`LEFT JOIN ${table} ON ${condition}`);
    return this;
  }

  public orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByClause = `ORDER BY ${column} ${direction}`;
    return this;
  }

  public limit(count: number): QueryBuilder {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }

  public offset(count: number): QueryBuilder {
    this.offsetClause = `OFFSET ${count}`;
    return this;
  }

  public buildSelect(): { query: string; parameters: any[] } {
    const parts = [
      `SELECT ${this.selectColumns.join(', ')}`,
      `FROM ${this.tableName}`,
      ...this.joinClauses,
      this.whereConditions.length > 0 ? `WHERE ${this.whereConditions.join(' AND ')}` : '',
      this.orderByClause,
      this.limitClause,
      this.offsetClause
    ].filter(part => part !== '');

    return {
      query: parts.join(' '),
      parameters: this.parameters
    };
  }

  public buildInsert(data: Record<string, any>): { query: string; parameters: any[] } {
    const columns = Object.keys(data);
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    const values = Object.values(data);

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    return {
      query: query.trim(),
      parameters: values
    };
  }

  public buildUpdate(data: Record<string, any>): { query: string; parameters: any[] } {
    const columns = Object.keys(data);
    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');
    const values = Object.values(data);

    // Add WHERE parameters
    const allParameters = [...values, ...this.parameters];
    const whereClauseAdjusted = this.whereConditions.map(condition => {
      return condition.replace(/\$(\d+)/g, (match, num) => `$${parseInt(num) + values.length}`);
    }).join(' AND ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      ${whereClauseAdjusted ? `WHERE ${whereClauseAdjusted}` : ''}
      RETURNING *
    `;

    return {
      query: query.trim(),
      parameters: allParameters
    };
  }

  public buildDelete(): { query: string; parameters: any[] } {
    const query = `
      DELETE FROM ${this.tableName}
      ${this.whereConditions.length > 0 ? `WHERE ${this.whereConditions.join(' AND ')}` : ''}
      RETURNING *
    `;

    return {
      query: query.trim(),
      parameters: this.parameters
    };
  }
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

export class DatabaseOperations {
  private db: DatabaseManager;

  constructor() {
    this.db = DatabaseManager.getInstance();
  }

  /**
   * Execute a raw SQL query
   */
  public async query(sql: string, parameters: any[] = []): Promise<QueryResult> {
    const pool = this.db.getPool();
    const start = Date.now();
    
    try {
      const result = await pool.query(sql, parameters);
      const duration = Date.now() - start;
      
      console.log('🔍 Query executed:', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      console.error('❌ Query failed:', {
        sql: sql.substring(0, 100),
        error: error.message,
        parameters
      });
      throw error;
    }
  }

  /**
   * Execute query with automatic transaction
   */
  public async transaction<T>(operations: (client: PoolClient) => Promise<T>): Promise<T> {
    const pool = this.db.getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      console.log('📦 Transaction started');
      
      const result = await operations(client);
      
      await client.query('COMMIT');
      console.log('✅ Transaction committed');
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('🔄 Transaction rolled back:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Insert record with automatic ID generation
   */
  public async insert(table: string, data: Record<string, any>): Promise<any> {
    const builder = new QueryBuilder(table);
    const { query, parameters } = builder.buildInsert({
      ...data,
      id: data.id || this.generateId(table),
      created_at: data.created_at || new Date(),
      updated_at: data.updated_at || new Date()
    });
    
    const result = await this.query(query, parameters);
    return result.rows[0];
  }

  /**
   * Update record by ID
   */
  public async updateById(table: string, id: string, data: Record<string, any>): Promise<any> {
    const builder = new QueryBuilder(table);
    builder.where('id', '=', id);
    
    const { query, parameters } = builder.buildUpdate({
      ...data,
      updated_at: new Date()
    });
    
    const result = await this.query(query, parameters);
    return result.rows[0];
  }

  /**
   * Find record by ID
   */
  public async findById(table: string, id: string): Promise<any | null> {
    const builder = new QueryBuilder(table);
    builder.where('id', '=', id);
    
    const { query, parameters } = builder.buildSelect();
    const result = await this.query(query, parameters);
    
    return result.rows[0] || null;
  }

  /**
   * Find records with conditions
   */
  public async find(table: string, conditions: Record<string, any> = {}, options: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDir?: 'ASC' | 'DESC';
  } = {}): Promise<any[]> {
    const builder = new QueryBuilder(table);
    
    // Add where conditions
    Object.entries(conditions).forEach(([column, value]) => {
      if (Array.isArray(value)) {
        builder.whereIn(column, value);
      } else {
        builder.where(column, '=', value);
      }
    });
    
    // Add options
    if (options.orderBy) {
      builder.orderBy(options.orderBy, options.orderDir || 'ASC');
    }
    if (options.limit) {
      builder.limit(options.limit);
    }
    if (options.offset) {
      builder.offset(options.offset);
    }
    
    const { query, parameters } = builder.buildSelect();
    const result = await this.query(query, parameters);
    
    return result.rows;
  }

  /**
   * Count records with conditions
   */
  public async count(table: string, conditions: Record<string, any> = {}): Promise<number> {
    const builder = new QueryBuilder(table);
    builder.select(['COUNT(*) as count']);
    
    Object.entries(conditions).forEach(([column, value]) => {
      builder.where(column, '=', value);
    });
    
    const { query, parameters } = builder.buildSelect();
    const result = await this.query(query, parameters);
    
    return parseInt(result.rows[0].count);
  }

  /**
   * Delete record by ID
   */
  public async deleteById(table: string, id: string): Promise<boolean> {
    const builder = new QueryBuilder(table);
    builder.where('id', '=', id);
    
    const { query, parameters } = builder.buildDelete();
    const result = await this.query(query, parameters);
    
    return result.rowCount > 0;
  }

  /**
   * Check if table exists
   */
  public async tableExists(tableName: string): Promise<boolean> {
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      );
    `;
    
    const result = await this.query(query, [tableName]);
    return result.rows[0].exists;
  }

  /**
   * Get table schema
   */
  public async getTableSchema(tableName: string): Promise<any[]> {
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `;
    
    const result = await this.query(query, [tableName]);
    return result.rows;
  }

  /**
   * Generate unique ID for table
   */
  private generateId(table: string): string {
    const prefix = table.substring(0, 4);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }
}

// =============================================================================
// MIGRATION SYSTEM
// =============================================================================

export class MigrationRunner {
  private db: DatabaseOperations;

  constructor() {
    this.db = new DatabaseOperations();
  }

  public async runMigrations(): Promise<void> {
    console.log('🏗️ Running database migrations...');

    // Ensure migrations table exists
    await this.createMigrationsTable();

    // Run migrations in order
    const migrations = [
      this.createUsersTable,
      this.createGamesTable,
      this.createWalletTransactionsTable,
      this.createGameMovesTable,
      this.createAchievementsTable,
      this.addIndexes
    ];

    for (const migration of migrations) {
      await this.runMigration(migration.name, migration.bind(this));
    }

    console.log('✅ All migrations completed');
  }

  private async createMigrationsTable(): Promise<void> {
    const exists = await this.db.tableExists('migrations');
    if (!exists) {
      await this.db.query(`
        CREATE TABLE migrations (
          id VARCHAR(100) PRIMARY KEY,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('📋 Created migrations table');
    }
  }

  private async runMigration(name: string, migrationFn: () => Promise<void>): Promise<void> {
    const existing = await this.db.find('migrations', { id: name });
    
    if (existing.length === 0) {
      try {
        await migrationFn();
        await this.db.insert('migrations', { id: name });
        console.log(`✅ Migration completed: ${name}`);
      } catch (error) {
        console.error(`❌ Migration failed: ${name}`, error);
        throw error;
      }
    } else {
      console.log(`⏭️ Migration skipped (already run): ${name}`);
    }
  }

  private async createUsersTable(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        mobile VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        user_type VARCHAR(20) NOT NULL DEFAULT 'PLAYER',
        avatar VARCHAR(500),
        date_of_birth DATE,
        gender VARCHAR(10),
        city VARCHAR(100),
        state VARCHAR(100),
        bio TEXT,
        referral_code VARCHAR(20),
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        email_verified BOOLEAN DEFAULT FALSE,
        mobile_verified BOOLEAN DEFAULT FALSE,
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        kyc_status VARCHAR(20) DEFAULT 'PENDING',
        kyc_level INTEGER DEFAULT 0,
        skill_level VARCHAR(20) DEFAULT 'BEGINNER',
        skill_rating INTEGER DEFAULT 1200,
        level INTEGER DEFAULT 1,
        experience INTEGER DEFAULT 0,
        rank INTEGER,
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        last_active TIMESTAMP
      );
    `);
  }

  private async createGamesTable(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS games (
        id VARCHAR(50) PRIMARY KEY,
        room_id VARCHAR(20) NOT NULL,
        game_mode VARCHAR(20) NOT NULL,
        stake_amount DECIMAL(10,2) NOT NULL,
        prize_pool DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) NOT NULL,
        max_players INTEGER DEFAULT 2,
        current_player VARCHAR(50),
        game_state JSONB DEFAULT '{}',
        rules JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        finished_at TIMESTAMP,
        winner_id VARCHAR(50),
        FOREIGN KEY (winner_id) REFERENCES users(id)
      );
    `);
  }

  private async createWalletTransactionsTable(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        wallet_id VARCHAR(50) NOT NULL,
        transaction_type VARCHAR(20) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        fees DECIMAL(10,2) DEFAULT 0,
        tax DECIMAL(10,2) DEFAULT 0,
        net_amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'INR',
        status VARCHAR(20) NOT NULL,
        payment_method VARCHAR(50),
        gateway_reference VARCHAR(100),
        game_id VARCHAR(50),
        description TEXT,
        balance_before DECIMAL(10,2),
        balance_after DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP,
        failure_reason TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (game_id) REFERENCES games(id)
      );
    `);
  }

  private async createGameMovesTable(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS game_moves (
        id VARCHAR(50) PRIMARY KEY,
        game_id VARCHAR(50) NOT NULL,
        player_id VARCHAR(50) NOT NULL,
        move_number INTEGER NOT NULL,
        move_type VARCHAR(20) NOT NULL,
        move_data JSONB NOT NULL,
        game_state JSONB NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processing_time INTEGER DEFAULT 0,
        valid_move BOOLEAN DEFAULT TRUE,
        fraud_score INTEGER DEFAULT 0,
        FOREIGN KEY (game_id) REFERENCES games(id),
        FOREIGN KEY (player_id) REFERENCES users(id)
      );
    `);
  }

  private async createAchievementsTable(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        icon VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        rarity VARCHAR(20) NOT NULL,
        criteria JSONB NOT NULL,
        rewards JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_achievements (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        achievement_id VARCHAR(50) NOT NULL,
        progress INTEGER DEFAULT 0,
        unlocked_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (achievement_id) REFERENCES achievements(id),
        UNIQUE(user_id, achievement_id)
      );
    `);
  }

  private async addIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
      'CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);',
      'CREATE INDEX IF NOT EXISTS idx_users_skill_rating ON users(skill_rating);',
      'CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);',
      'CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);',
      'CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON game_moves(game_id);',
      'CREATE INDEX IF NOT EXISTS idx_game_moves_player_id ON game_moves(player_id);'
    ];

    for (const indexQuery of indexes) {
      await this.db.query(indexQuery);
    }
  }
}

// =============================================================================
// REDIS INTEGRATION (FOR CACHING AND SESSIONS)
// =============================================================================

import Redis from 'ioredis';

export class RedisManager {
  private static instance: RedisManager;
  private client: Redis;

  private constructor() {
    this.client = new Redis(process.env.REDIS_URL || {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    this.client.on('connect', () => {
      console.log('🔗 Redis connected');
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis error:', err);
    });
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  public async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, serializedValue, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, serializedValue);
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  public async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  public async increment(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  public async setExpire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  public getClient(): Redis {
    return this.client;
  }
}

// Export singleton instances
export const db = new DatabaseOperations();
export const redis = RedisManager.getInstance();

// Initialize database connection
export async function initializeDatabase() {
  const dbManager = DatabaseManager.getInstance();
  
  // Test connection
  const isConnected = await dbManager.testConnection();
  if (!isConnected) {
    throw new Error('Failed to connect to database');
  }

  // Run migrations
  const migrationRunner = new MigrationRunner();
  await migrationRunner.runMigrations();

  console.log('🎯 Database initialized successfully');
}