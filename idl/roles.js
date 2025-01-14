"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDL = void 0;
exports.IDL = {
    "version": "0.1.0",
    "name": "roles",
    "instructions": [
        {
            "name": "createManager",
            "accounts": [
                {
                    "name": "rolesManager",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "multisig",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "payer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "addUser",
            "accounts": [
                {
                    "name": "user",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "rolesManager",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "multisig",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "payer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "authority",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "transaction",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "originKey",
                    "type": "publicKey"
                },
                {
                    "name": "role",
                    "type": {
                        "defined": "Role"
                    }
                },
                {
                    "name": "name",
                    "type": "string"
                }
            ]
        },
        {
            "name": "changeRole",
            "accounts": [
                {
                    "name": "user",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "multisig",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "payer",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "authority",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "transaction",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "role",
                    "type": {
                        "defined": "Role"
                    }
                }
            ]
        },
        {
            "name": "createProxy",
            "accounts": [
                {
                    "name": "multisig",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "transaction",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "user",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "delegate",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "creator",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "squadsProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "authorityIndex",
                    "type": "u32"
                }
            ]
        },
        {
            "name": "addProxy",
            "accounts": [
                {
                    "name": "multisig",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "transaction",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "instruction",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "user",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "delegate",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "creator",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "squadsProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "incomingInstruction",
                    "type": {
                        "defined": "IncomingInstruction"
                    }
                }
            ]
        },
        {
            "name": "activateProxy",
            "accounts": [
                {
                    "name": "multisig",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "transaction",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "user",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "creator",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "delegate",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "squadsProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "approveProxy",
            "accounts": [
                {
                    "name": "multisig",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "transaction",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "user",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "member",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "delegate",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "squadsProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "rejectProxy",
            "accounts": [
                {
                    "name": "multisig",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "transaction",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "user",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "member",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "delegate",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "squadsProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "executeTxProxy",
            "accounts": [
                {
                    "name": "multisig",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "transaction",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "user",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "member",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "delegate",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "squadsProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "accountList",
                    "type": "bytes"
                }
            ]
        }
    ],
    "accounts": [
        {
            "name": "rolesManager",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "ms",
                        "type": "publicKey"
                    },
                    {
                        "name": "roleIndex",
                        "type": "u32"
                    },
                    {
                        "name": "bump",
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "user",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "name",
                        "type": "string"
                    },
                    {
                        "name": "role",
                        "type": {
                            "defined": "Role"
                        }
                    },
                    {
                        "name": "originKey",
                        "type": "publicKey"
                    },
                    {
                        "name": "bump",
                        "type": "u8"
                    },
                    {
                        "name": "ms",
                        "type": "publicKey"
                    },
                    {
                        "name": "roleIndex",
                        "type": "u32"
                    }
                ]
            }
        }
    ],
    "types": [
        {
            "name": "MsAccountMeta",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "pubkey",
                        "type": "publicKey"
                    },
                    {
                        "name": "isSigner",
                        "type": "bool"
                    },
                    {
                        "name": "isWritable",
                        "type": "bool"
                    }
                ]
            }
        },
        {
            "name": "IncomingInstruction",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "programId",
                        "type": "publicKey"
                    },
                    {
                        "name": "keys",
                        "type": {
                            "vec": {
                                "defined": "MsAccountMeta"
                            }
                        }
                    },
                    {
                        "name": "data",
                        "type": "bytes"
                    }
                ]
            }
        },
        {
            "name": "Role",
            "type": {
                "kind": "enum",
                "variants": [
                    {
                        "name": "Initiate"
                    },
                    {
                        "name": "Vote"
                    },
                    {
                        "name": "Execute"
                    },
                    {
                        "name": "InitiateAndExecute"
                    },
                    {
                        "name": "InitiateAndVote"
                    },
                    {
                        "name": "VoteAndExecute"
                    }
                ]
            }
        }
    ],
    "errors": [
        {
            "code": 6000,
            "name": "InvalidRole"
        }
    ]
};
