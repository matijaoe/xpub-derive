#!/usr/bin/env node
import { Command } from 'commander'
import * as bitcoin from 'bitcoinjs-lib'
import { BIP32Factory } from 'bip32'
import * as ecc from 'tiny-secp256k1'
import { Buffer } from 'buffer'
import bs58check from 'bs58check'

const bip32 = BIP32Factory(ecc)

// Custom BIP84 network config for zpub
const bitcoinBip84 = {
	...bitcoin.networks.bitcoin,
	bip32: {
		public: 0x04b24746, // zpub
		private: 0x04b2430c, // zprv
	},
}

const zpubToXpub = (zpub: string): string => {
	const data = Buffer.from(bs58check.decode(zpub))
	// standard 'hack' rewritting the version bytes
	data.writeUInt32BE(bitcoin.networks.bitcoin.bip32.public, 0)
	return bs58check.encode(data)
}

const xpubToZpub = (xpub: string): string => {
	const data = Buffer.from(bs58check.decode(xpub))
	data.writeUInt32BE(bitcoinBip84.bip32.public, 0) // zpub version bytes
	return bs58check.encode(data)
}

const program = new Command()

program
	.name('derive_addrs')
	.description(
		'Derives addresses from an xpub or zpub, with optional receive/change flags.'
	)
	.argument('<extendedPub>', 'Extended public key (xpub or zpub)')
	.option('-r, --receive', 'Derive receive addresses (chain=0)', false)
	.option('-c, --change', 'Derive change addresses (chain=1)', false)
	.option('-n, --count <number>', 'Number of addresses to derive', '5')
	.option('-x, --show-xpub', 'Show parent xpub/zpub', false)
	.action((extendedPub, options) => {
		const { receive, change, showXpub } = options
		let { count } = options
		count = parseInt(count, 10)
		if (isNaN(count) || count < 1) {
			console.error('Count must be a positive integer.')
			process.exit(1)
		}

		// If user didn't specify either flag, default to receive only
		if (!receive && !change) {
			// same as if they specified --receive
			options.receive = true
		}

		try {
			deriveAddressesToOutput(extendedPub, count, options)
		} catch (err) {
			console.error(`Error: ${(err as Error).message}`)
			process.exit(1)
		}
	})

program.parse(process.argv)

function parseAnyPub(extendedPub: string) {
	if (extendedPub.startsWith('zpub')) {
		return {
			node: bip32.fromBase58(extendedPub, bitcoinBip84),
			network: bitcoinBip84,
		}
	} else if (extendedPub.startsWith('xpub')) {
		return {
			node: bip32.fromBase58(extendedPub, bitcoin.networks.bitcoin),
			network: bitcoin.networks.bitcoin,
		}
	} else {
		throw new Error('Unsupported prefix. Provide an xpub or zpub.')
	}
}

function deriveAddressesToOutput(
	extendedPub: string,
	count: number,
	{
		receive,
		change,
		showXpub,
	}: { receive: boolean; change: boolean; showXpub: boolean }
) {
	const { node, network } = parseAnyPub(extendedPub)

	// We'll assume BIP84-style path m/84'/0'/0'/chain/index for demonstration,
	// which is standard for a zpub. If your xpub truly is BIP44, you'd normally
	// do m/44'/0'/0'/chain/index + p2pkh addresses.
	// For simplicity we produce bc1 addresses (p2wpkh) for both xpub & zpub.

	const chainIndices = []
	if (receive) chainIndices.push(0)
	if (change) chainIndices.push(1)

	const ADDRESS_LENGTH = 42 // bc1 addresses are 42 chars

	if (showXpub) {
		const parentXpub = extendedPub.startsWith('zpub')
			? zpubToXpub(extendedPub)
			: node.neutered().toBase58()
		const parentZpub = extendedPub.startsWith('zpub')
			? extendedPub
			: xpubToZpub(parentXpub)
		console.log(`xpub: ${parentXpub}`)
		console.log(`zpub: ${parentZpub}\n`)
	}

	for (const chainIndex of chainIndices) {
		console.log(`${chainIndex === 0 ? 'Receive' : 'Change'} addresses:`)

		for (let i = 0; i < count; i++) {
			const child = node.derive(chainIndex).derive(i)
			const pubkey = Buffer.from(child.publicKey)
			const { address } = bitcoin.payments.p2wpkh({ pubkey, network })
			console.log(
				`${(address ?? '').padEnd(
					ADDRESS_LENGTH
				)} : m/84'/0'/0'/${chainIndex}/${i}`
			)
		}
		// Add newline if this isn't the last chain index
		if (chainIndex !== chainIndices[chainIndices.length - 1]) {
			console.log()
		}
	}
}
