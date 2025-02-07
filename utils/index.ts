import { BIP32Factory } from 'bip32'
import * as bitcoin from 'bitcoinjs-lib'
import bs58check from 'bs58check'
import * as ecc from 'tiny-secp256k1'
import { bitcoinBip84, type AddressRole } from '../config/networks'

export const bip32 = BIP32Factory(ecc)

export const zpubToXpub = (zpub: string): string => {
	const data = Buffer.from(bs58check.decode(zpub))
	// standard 'hack' rewritting the version bytes
	data.writeUInt32BE(bitcoin.networks.bitcoin.bip32.public, 0)
	return bs58check.encode(data)
}

export function parseAnyPub(extendedPub: string) {
	if (extendedPub.startsWith('zpub')) {
		return {
			node: bip32.fromBase58(extendedPub, bitcoinBip84),
			network: bitcoinBip84,
		}
	} else if (extendedPub.startsWith('xpub')) {
		// hardcoded to native segwit
		return {
			node: bip32.fromBase58(extendedPub, bitcoin.networks.bitcoin),
			network: bitcoin.networks.bitcoin,
		}
	} else {
		throw new Error('Unsupported prefix. Provide an xpub or zpub.')
	}
}

export const xpubToZpub = (xpub: string): string => {
	const data = Buffer.from(bs58check.decode(xpub))
	data.writeUInt32BE(bitcoinBip84.bip32.public, 0) // zpub version bytes
	return bs58check.encode(data)
}

export const deriveAddress_p2wpkh = (
	xpub: string,
	addressRole: AddressRole,
	addrIndex: number
) => {
	const { node, network } = parseAnyPub(xpub)
	const child = node.derive(addressRole).derive(addrIndex)
	const pubkey = Buffer.from(child.publicKey)
	const { address } = bitcoin.payments.p2wpkh({ pubkey, network })
	return address
}

export const deriveAddresses_p2wpkh = (
	xpub: string,
	count: number,
	addressRole: AddressRole
) => {
	return Array.from({ length: count }, (_, i) => {
		return deriveAddress_p2wpkh(xpub, addressRole, i)
	})
}
