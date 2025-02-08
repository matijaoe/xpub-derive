import { BIP32Factory } from 'bip32'
import * as bitcoin from '@bitgo/utxo-lib'
import bs58check from 'bs58check'
import * as ecc from '@bitcoinerlab/secp256k1'
import { bitcoinBip84, type AddressRole } from '../config/networks'

export const bip32 = BIP32Factory(ecc)

export const convertZpubToXpub = (zpub: string): string => {
	const data = Buffer.from(bs58check.decode(zpub))
	// standard 'hack' rewritting the version bytes
	data.writeUInt32BE(bitcoin.networks.bitcoin.bip32.public, 0)
	return bs58check.encode(data)
}

export const convertXpubToZpub = (xpub: string): string => {
	const data = Buffer.from(bs58check.decode(xpub))
	data.writeUInt32BE(bitcoinBip84.bip32.public, 0)
	return bs58check.encode(data)
}

export function parseAnyPub(extendedPub: string) {
	if (extendedPub.startsWith('zpub')) {
		return bip32.fromBase58(extendedPub, bitcoinBip84)
	} else if (extendedPub.startsWith('xpub')) {
		// hardcoded to native segwit
		return bip32.fromBase58(extendedPub, bitcoin.networks.bitcoin)
	} else {
		throw new Error('Unsupported prefix. Provide an xpub or zpub.')
	}
}

export const deriveAddress_p2wpkh = (
	extendedPub: string,
	addressRole: AddressRole,
	addrIndex: number
) => {
	const node = parseAnyPub(extendedPub)
	const child = node.derive(addressRole).derive(addrIndex)
	const { address } = bitcoin.payments.p2wpkh({
		pubkey: Buffer.from(child.publicKey),
		network: bitcoin.networks.bitcoin,
	})
	return address!
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

export const getAddressDerivationPath_p2wpkh = (
	addressRole: AddressRole,
	addrIndex: number
) => {
	return `m/84'/0'/0'/${addressRole}/${addrIndex}`
}

export const getAddressMempoolUrl = (address: string) => {
	return `https://mempool.space/address/${address}`
}
