"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDL = void 0;
exports.IDL = {
    "version": "0.1.0",
    "name": "txmeta",
    "instructions": [
        {
            "name": "trackMeta",
            "accounts": [
                {
                    "name": "member",
                    "isMut": true,
                    "isSigner": true
                }
            ],
            "args": [
                {
                    "name": "meta",
                    "type": "string"
                }
            ]
        }
    ]
};
