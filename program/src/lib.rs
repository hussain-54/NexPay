use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("AMcpmff8xMoDms8Y1VYhPCEZy27Nso8pWHqjFLLyddYS");

#[program]
pub mod nexpay_program {
    use super::*;

    pub fn initialize_platform(ctx: Context<InitializePlatform>) -> Result<()> {
        let platform_config = &mut ctx.accounts.platform_config;
        platform_config.admin = ctx.accounts.admin.key();
        platform_config.fee_basis_points = 10; // 0.1%
        platform_config.fee_wallet = ctx.accounts.admin.key();
        platform_config.total_volume = 0;
        platform_config.total_users = 0;
        platform_config.is_paused = false;
        platform_config.bump = ctx.bumps.platform_config;

        emit!(PlatformInitialized {
            admin: ctx.accounts.admin.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn initialize_user(
        ctx: Context<InitializeUser>,
        username: String,
        referral_code: String,
    ) -> Result<()> {
        require!(username.len() <= 32, NexPayError::UsernameTooLong);
        require!(!ctx.accounts.platform_config.is_paused, NexPayError::PlatformPaused);
        require!(referral_code.len() <= 16, NexPayError::ReferralCodeTooLong);

        let user_account = &mut ctx.accounts.user_account;
        user_account.owner = ctx.accounts.user.key();
        user_account.username = username.clone();
        user_account.kyc_verified = false;
        user_account.tier = 0;
        user_account.total_sent = 0;
        user_account.total_received = 0;
        user_account.transfer_count = 0;
        user_account.created_at = Clock::get()?.unix_timestamp;
        user_account.bump = ctx.bumps.user_account;
        user_account.is_frozen = false;

        // Generate referral code from first 8 chars of pubkey + "NX"
        let pubkey_str = ctx.accounts.user.key().to_string();
        let generated_referral = format!("{}NX", &pubkey_str[..8]);
        user_account.referral_code = generated_referral;

        let platform_config = &mut ctx.accounts.platform_config;
        platform_config.total_users += 1;

        emit!(UserRegistered {
            user_pubkey: ctx.accounts.user.key(),
            username,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn transfer_stablecoin(
        ctx: Context<TransferStablecoin>,
        amount_usdc: u64,
        recipient_country: String,
        memo: String,
    ) -> Result<()> {
        let platform_config = &mut ctx.accounts.platform_config;
        let sender_user_account = &mut ctx.accounts.sender_user_account;
        let recipient_user_account = &mut ctx.accounts.recipient_user_account;

        require!(!platform_config.is_paused, NexPayError::PlatformPaused);
        require!(!sender_user_account.is_frozen, NexPayError::WalletFrozen);
        require!(sender_user_account.kyc_verified, NexPayError::KycRequired);
        require!(amount_usdc > 0, NexPayError::InvalidAmount);
        require!(
            ctx.accounts.sender.key() != recipient_user_account.owner,
            NexPayError::SelfTransfer
        );
        require!(
            ctx.accounts.sender_token_account.amount >= amount_usdc,
            NexPayError::InsufficientFunds
        );

        // Check tier limits
        let max_amount = match sender_user_account.tier {
            0 => 1_000_000_000,     // 1,000 USDC
            1 => 10_000_000_000,    // 10,000 USDC
            2 => 100_000_000_000,   // 100,000 USDC
            _ => 1_000_000_000,
        };
        require!(amount_usdc <= max_amount, NexPayError::TierLimitExceeded);

        let fee = (amount_usdc as u128)
            .checked_mul(platform_config.fee_basis_points as u128)
            .unwrap()
            .checked_div(10_000)
            .unwrap() as u64;

        let net_amount = amount_usdc
            .checked_sub(fee)
            .ok_or(NexPayError::ArithmeticOverflow)?;

        // Transfer net to recipient
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.sender_token_account.to_account_info(),
                    to: ctx.accounts.recipient_token_account.to_account_info(),
                    authority: ctx.accounts.sender.to_account_info(),
                },
            ),
            net_amount,
        )?;

        // Transfer fee
        if fee > 0 {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.sender_token_account.to_account_info(),
                        to: ctx.accounts.fee_token_account.to_account_info(),
                        authority: ctx.accounts.sender.to_account_info(),
                    },
                ),
                fee,
            )?;
        }

        // Update PDA
        let transfer_record = &mut ctx.accounts.transfer_record;
        transfer_record.sender = ctx.accounts.sender.key();
        transfer_record.recipient = recipient_user_account.owner;
        transfer_record.amount_usdc = amount_usdc;
        transfer_record.fee_collected = fee;
        transfer_record.recipient_country = recipient_country.clone();
        transfer_record.timestamp = Clock::get()?.unix_timestamp;
        transfer_record.tx_hash_ref = memo;
        transfer_record.status = 1; // completed
        transfer_record.bump = ctx.bumps.transfer_record;

        // Update sender state
        sender_user_account.total_sent = sender_user_account
            .total_sent
            .saturating_add(amount_usdc);
        sender_user_account.transfer_count += 1;

        // Update recipient state
        recipient_user_account.total_received = recipient_user_account
            .total_received
            .saturating_add(net_amount);

        // Update platform state
        platform_config.total_volume = platform_config
            .total_volume
            .saturating_add(amount_usdc);

        emit!(TransferCompleted {
            sender: ctx.accounts.sender.key(),
            recipient: recipient_user_account.owner,
            amount_usdc,
            fee,
            recipient_country,
            timestamp: transfer_record.timestamp,
        });

        Ok(())
    }

    pub fn update_kyc_status(
        ctx: Context<UpdateKycStatus>,
        kyc_verified: bool,
        tier: u8,
    ) -> Result<()> {
        require!(tier <= 2, NexPayError::InvalidTier);
        let user_account = &mut ctx.accounts.user_account;
        user_account.kyc_verified = kyc_verified;
        user_account.tier = tier;

        emit!(KycUpdated {
            user: user_account.owner,
            kyc_verified,
            tier,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn freeze_wallet(ctx: Context<FreezeWallet>, freeze: bool) -> Result<()> {
        let caller = ctx.accounts.caller.key();
        let user_account = &mut ctx.accounts.user_account;
        let platform_config = &ctx.accounts.platform_config;

        require!(
            caller == user_account.owner || caller == platform_config.admin,
            NexPayError::Unauthorized
        );

        user_account.is_frozen = freeze;

        emit!(WalletFrozen {
            user: user_account.owner,
            frozen: freeze,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn update_platform_fee(
        ctx: Context<UpdatePlatformFee>,
        new_fee_basis_points: u16,
    ) -> Result<()> {
        require!(new_fee_basis_points <= 500, NexPayError::InvalidFee); // Max 5%
        let platform_config = &mut ctx.accounts.platform_config;
        platform_config.fee_basis_points = new_fee_basis_points;

        emit!(FeeUpdated {
            new_fee_basis_points,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn pause_platform(ctx: Context<AdminTogglePlatform>) -> Result<()> {
        ctx.accounts.platform_config.is_paused = true;
        Ok(())
    }

    pub fn unpause_platform(ctx: Context<AdminTogglePlatform>) -> Result<()> {
        ctx.accounts.platform_config.is_paused = false;
        Ok(())
    }
}

// --- Accounts Contexts ---

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 128,
        seeds = [b"config"],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        space = 256,
        seeds = [b"user", user.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub platform_config: Account<'info, PlatformConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferStablecoin<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    #[account(
        mut,
        has_one = owner @ NexPayError::Unauthorized,
        seeds = [b"user", sender.key().as_ref()],
        bump = sender_user_account.bump,
    )]
    pub sender_user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub recipient_user_account: Account<'info, UserAccount>,
    #[account(mut)]
    pub sender_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub fee_token_account: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = sender,
        space = 300,
        seeds = [b"transfer", sender.key().as_ref(), &sender_user_account.transfer_count.to_le_bytes()],
        bump
    )]
    pub transfer_record: Account<'info, TransferRecord>,
    #[account(mut)]
    pub platform_config: Account<'info, PlatformConfig>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct UpdateKycStatus<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(has_one = admin @ NexPayError::AdminOnly)]
    pub platform_config: Account<'info, PlatformConfig>,
    #[account(mut)]
    pub user_account: Account<'info, UserAccount>,
}

#[derive(Accounts)]
pub struct FreezeWallet<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(mut)]
    pub user_account: Account<'info, UserAccount>,
    pub platform_config: Account<'info, PlatformConfig>,
}

#[derive(Accounts)]
pub struct UpdatePlatformFee<'info> {
    pub admin: Signer<'info>,
    #[account(mut, has_one = admin @ NexPayError::AdminOnly)]
    pub platform_config: Account<'info, PlatformConfig>,
}

#[derive(Accounts)]
pub struct AdminTogglePlatform<'info> {
    pub admin: Signer<'info>,
    #[account(mut, has_one = admin @ NexPayError::AdminOnly)]
    pub platform_config: Account<'info, PlatformConfig>,
}

// --- State Accounts ---

#[account]
pub struct UserAccount {
    pub owner: Pubkey,
    pub username: String,
    pub kyc_verified: bool,
    pub tier: u8,
    pub total_sent: u64,
    pub total_received: u64,
    pub transfer_count: u32,
    pub created_at: i64,
    pub bump: u8,
    pub referral_code: String,
    pub is_frozen: bool,
}

#[account]
pub struct TransferRecord {
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub amount_usdc: u64,
    pub fee_collected: u64,
    pub recipient_country: String,
    pub timestamp: i64,
    pub tx_hash_ref: String,
    pub status: u8,
    pub bump: u8,
}

#[account]
pub struct PlatformConfig {
    pub admin: Pubkey,
    pub fee_basis_points: u16,
    pub fee_wallet: Pubkey,
    pub total_volume: u64,
    pub total_users: u32,
    pub is_paused: bool,
    pub bump: u8,
}

// --- Errors ---

#[error_code]
pub enum NexPayError {
    #[msg("Platform is paused")]
    PlatformPaused,
    #[msg("Wallet is frozen")]
    WalletFrozen,
    #[msg("KYC verification required")]
    KycRequired,
    #[msg("Insufficient token balance")]
    InsufficientFunds,
    #[msg("Transaction limit exceeded for tier")]
    TierLimitExceeded,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Admin only")]
    AdminOnly,
    #[msg("Username too long")]
    UsernameTooLong,
    #[msg("Cannot send to yourself")]
    SelfTransfer,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Referral code too long")]
    ReferralCodeTooLong,
    #[msg("Invalid tier")]
    InvalidTier,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid fee")]
    InvalidFee,
}

// --- Events ---

#[event]
pub struct PlatformInitialized {
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct UserRegistered {
    pub user_pubkey: Pubkey,
    pub username: String,
    pub timestamp: i64,
}

#[event]
pub struct TransferCompleted {
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub amount_usdc: u64,
    pub fee: u64,
    pub recipient_country: String,
    pub timestamp: i64,
}

#[event]
pub struct KycUpdated {
    pub user: Pubkey,
    pub kyc_verified: bool,
    pub tier: u8,
    pub timestamp: i64,
}

#[event]
pub struct WalletFrozen {
    pub user: Pubkey,
    pub frozen: bool,
    pub timestamp: i64,
}

#[event]
pub struct FeeUpdated {
    pub new_fee_basis_points: u16,
    pub timestamp: i64,
}
