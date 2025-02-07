#!/usr/bin/env node
import { Command } from 'commander'
import {
	deriveAddress_p2wpkh,
	parseAnyPub,
	xpubToZpub,
	zpubToXpub,
} from './utils'
import { ADDRESS_ROLE, type AddressRole } from './config/networks'

const program = new Command()

program
	.name('derive_addrs')
	.description(
		'Derives addresses from an xpub or zpub, with optional receive/change flags.'
	)
	.argument('<extendedPub>', 'Extended public key (xpub or zpub)')
	.option('-e, --external', 'Derive external addresses (chain=0)', false)
	.option('-i, --internal', 'Derive internal addresses (chain=1)', false)
	.option('-n, --count <number>', 'Number of addresses to derive', '5')
	.option('-x, --show-xpub', 'Show parent xpub/zpub', false)
	.action((extendedPub, options) => {
		const { external, internal } = options
		let { count: addressCount } = options
		addressCount = parseInt(addressCount, 10)
		if (isNaN(addressCount) || addressCount < 1) {
			console.error('Count must be a positive integer.')
			process.exit(1)
		}

		// If user didn't specify either flag, default to external only
		if (!external && !internal) {
			// same as if they specified --external
			options.external = true
		}

		try {
			deriveAddressesToOutput(extendedPub, addressCount, options)
		} catch (err) {
			console.error(`Error: ${(err as Error).message}`)
			process.exit(1)
		}
	})

program.parse(process.argv)

function deriveAddressesToOutput(
	extendedPub: string,
	count: number,
	{
		external,
		internal,
		showXpub,
	}: { external: boolean; internal: boolean; showXpub: boolean }
) {
	const { node } = parseAnyPub(extendedPub)

	// We'll assume BIP84-style path m/84'/0'/0'/chain/index for demonstration,
	// which is standard for a zpub. If your xpub truly is BIP44, you'd normally
	// do m/44'/0'/0'/chain/index + p2pkh addresses.
	// For simplicity we produce bc1 addresses (p2wpkh) for both xpub & zpub.

	const addressRoles: AddressRole[] = []
	if (external) addressRoles.push(ADDRESS_ROLE.external)
	if (internal) addressRoles.push(ADDRESS_ROLE.internal)

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

	for (const chainIndex of addressRoles) {
		console.log(`${chainIndex === 0 ? 'External' : 'Internal'} addresses:`)

		for (let i = 0; i < count; i++) {
			const address = deriveAddress_p2wpkh(extendedPub, chainIndex, i)
			console.log(
				`${(address ?? '').padEnd(
					ADDRESS_LENGTH
				)} : m/84'/0'/0'/${chainIndex}/${i}`
			)
		}
		// Add newline if this isn't the last chain index
		if (chainIndex !== addressRoles.at(-1)) {
			console.log('')
		}
	}
}
