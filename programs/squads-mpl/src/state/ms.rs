use anchor_lang::prelude::*;

#[account]
pub struct Ms {
    pub threshold: u16,
    pub authority_index: u16,
    pub transaction_index: u32,
    pub processed_index: u32,
    pub bump: u8,
    pub creator: Pubkey,
    pub keys: Vec<Pubkey>
}

impl Ms {
    pub const MAXIMUM_SIZE: usize = 4 + (32 * 10) + // initial space for 10 keys 
        2 +  // threshold value
        2 +  // authority index
        4 +  // transaction index
        4 +  // processed transaction index
        1 +  // PDA bump
        32;  // creator

    pub fn init (&mut self, threshold: u16, creator: Pubkey, members: Vec<Pubkey>, bump: u8) -> Result<()> {
        self.threshold = threshold;
        self.keys = members;
        self.keys.push(creator);
        self.authority_index = 0;
        self.transaction_index = 0;
        self.processed_index = 0;
        self.bump = bump;
        self.creator = creator;
        Ok(())
    }
}


#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MsTransactionStatus {
    Draft,          // Transaction default state
    Active,         // Transaction is live and ready
    ExecuteReady,   // Transaction has been approved and is pending execution
    Executed,       // Transaction has been executed
    Rejected        // Transaction has been rejected
}


#[account]
pub struct MsTransaction {
    pub creator: Pubkey,
    pub transaction_index: u32,
    pub authority_index: u32,
    pub authority_bump: u8,
    pub status: MsTransactionStatus,
    pub instruction_index: u8,
    pub bump: u8,
    pub approved: Vec<Pubkey>,
    pub rejected: Vec<Pubkey>,
}

impl MsTransaction {
    // the minimum size without the approved/rejected vecs
    pub const MINIMUM_SIZE: usize = 32 +    // the creator pubkey
        4 +                                 // the transaction index
        4 +                                 // the authority index (for this proposal)
        1 +                                 // the authority bump
        (1 + 12) +                          // the enum size
        1;                                  // the number of instructions (attached)

    pub fn initial_size_with_members(members_len: usize) -> usize {
        MsTransaction::MINIMUM_SIZE + (2 * members_len)
    }

    pub fn init(&mut self, creator: Pubkey, transaction_index: u32, bump: u8) -> Result<()>{
        self.creator = creator;
        self.transaction_index = transaction_index;
        self.authority_index = 0;
        self.authority_bump = bump;
        self.status = MsTransactionStatus::Draft;
        self.instruction_index = 0;
        self.approved = Vec::new();
        self.rejected = Vec::new();
        self.bump = bump;
        Ok(())
    }
}

#[account]
pub struct MsInstruction {
    pub program_id: Pubkey,
    pub keys: Vec<MsAccountMeta>,
    pub data: Vec<u8>,
    pub instruction_index: u8,
    pub bump: u8,
}

impl MsInstruction {
    pub const MAXIMUM_SIZE: usize = 1280;

    pub fn init(&mut self, instruction_index: u8, _instruction_data: Vec<u8>, bump: u8) -> Result<()> {
        self.bump = bump;
        self.instruction_index = instruction_index;
        Ok(())
    }
}

#[account]
pub struct MsAccountMeta {
    pub pubkey: Pubkey,
    pub is_signer: bool,
    pub is_writable: bool
}