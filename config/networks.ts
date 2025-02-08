import * as bitcoin from '@bitgo/utxo-lib'

// Custom BIP84 network config for zpub
export const bitcoinBip84 = {
	...bitcoin.networks.bitcoin,
	bip32: {
		public: 0x04b24746, // zpub
		private: 0x04b2430c, // zprv
	},
}

export const ADDRESS_ROLES = {
	external: 0, // receive addresses
	internal: 1, // change addresses
} as const

export type AddressRole = (typeof ADDRESS_ROLES)[keyof typeof ADDRESS_ROLES]
