import * as ecc from '@bitcoinerlab/secp256k1'
import * as bitcoin from '@bitgo/utxo-lib'
import { BIP32Factory } from 'bip32'
import bs58check from 'bs58check'
import { Buffer } from 'buffer'
import type { AddressRole } from '../config/networks'
import { convertZpubToXpub } from '../lib/xpub-converter'

export const bip32 = BIP32Factory(ecc)

// TODO: validate xpub (convert if needed)

/**
 * Parses an extended public key (xpub or zpub) into a BIP32 node.
 * If a zpub is provided, it converts it to an xpub for compatibility.
 *
 * @param extendedPub - The extended public key string.
 * @returns A BIP32 node.
 * @throws Error if the prefix is unsupported.
 */
export const parseAnyPub = (extendedPub: string) => {
	let convertedPub: string
	if (extendedPub.startsWith('zpub')) {
		convertedPub = convertZpubToXpub(extendedPub)
	} else if (extendedPub.startsWith('xpub')) {
		// Hardcoded for native SegWit usage
		convertedPub = extendedPub
	} else {
		throw new Error('Unsupported prefix. Provide an xpub or zpub.')
	}
	return bip32.fromBase58(convertedPub, bitcoin.networks.bitcoin)
}

function getExtendedKeyDepth(extendedKey: string): number {
	const buffer = bs58check.decode(extendedKey)
	return buffer.readUInt8(4) // Depth is stored in byte at index 4
}

/**
 * Derives a P2WPKH (native SegWit) address from an extended public key.
 *
 * @param extendedPub - The extended public key (xpub or zpub).
 * @param addressRole - The role for derivation (e.g. 0 for receive, 1 for change).
 * @param addrIndex - The address index.
 * @returns The derived Bitcoin address.
 */
export const deriveAddress_p2wpkh = (
	extendedPub: string,
	addressRole: AddressRole,
	addrIndex: number
): string => {
	const node = parseAnyPub(extendedPub)
	const child = node.derive(addressRole).derive(addrIndex)

	const { address } = bitcoin.payments.p2wpkh({
		pubkey: Buffer.from(child.publicKey),
		network: bitcoin.networks.bitcoin,
	})

	if (!address) {
		throw new Error('Failed to derive address')
	}

	return address
}

/**
 * Derives multiple P2WPKH addresses.
 *
 * @param extendedPub - The extended public key (xpub or zpub).
 * @param count - The number of addresses to derive.
 * @param addressRole - The derivation role (e.g., 0 for receive, 1 for change).
 * @returns An array of derived Bitcoin addresses.
 */
export const deriveAddresses_p2wpkh = (
	extendedPub: string,
	count: number,
	addressRole: AddressRole
): string[] => {
	return Array.from({ length: count }, (_, i) =>
		deriveAddress_p2wpkh(extendedPub, addressRole, i)
	)
}

/**
 * Returns the derivation path for a P2WPKH address.
 *
 * @param role - The derivation role (0 for receive, 1 for change).
 * @param index - The address index.
 * @param account - The account index (default to 0 if not specified).
 * @returns A string representing the full derivation path.
 */
export const getAddressDerivationPath_p2wpkh = ({
	role,
	index,
	account = 0, // Default to account 0
}: {
	role: AddressRole
	index: number
	account?: number
}): string => {
	return `m/84'/0'/${account}'/${role}/${index}`
}

/**
 * Returns a mempool.space URL for a given Bitcoin address.
 *
 * @param address - The Bitcoin address.
 * @returns A URL string.
 */
export const getAddressMempoolUrl = (address: string): string => {
	return `https://mempool.space/address/${address}`
}
