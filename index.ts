#!/usr/bin/env node
import Table from 'cli-table3'
import { Command } from 'commander'
import { ADDRESS_ROLE, type AddressRole } from './config/networks'
import {
	deriveAddresses_p2wpkh,
	parseAnyPub,
	xpubToZpub,
	zpubToXpub,
} from './utils'

const TABLE_PADDING = 1
const TABLE_SIDE_PADDING = TABLE_PADDING * 2

function createTable(options?: Table.TableConstructorOptions) {
	const colWidths = options?.colWidths?.map((width) =>
		width ? width + TABLE_SIDE_PADDING : width
	)
	return new Table({
		style: {
			'padding-left': TABLE_PADDING,
			'padding-right': TABLE_PADDING,
		},
		...options,
		colWidths,
	})
}

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
	.option('-m, --show-mempool', 'Show mempool.space links', false)
	.action((extendedPub, options) => {
		const { external, internal } = options
		let { count: addressCount } = options
		addressCount = parseInt(addressCount, 10)
		if (isNaN(addressCount) || addressCount < 1) {
			console.error('Count must be a positive integer.')
			process.exit(1)
		}
		if (addressCount > 100_000) {
			console.error('Count must be less than 100,000.')
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
	}: {
		external: boolean
		internal: boolean
		showXpub: boolean
	}
) {
	const { node } = parseAnyPub(extendedPub)

	// We'll assume BIP84-style path m/84'/0'/0'/chain/index for demonstration,
	// which is standard for a zpub. If your xpub truly is BIP44, you'd normally
	// do m/44'/0'/0'/chain/index + p2pkh addresses.
	// For simplicity we produce bc1 addresses (p2wpkh) for both xpub & zpub.

	const addressRoles: AddressRole[] = []
	if (external) addressRoles.push(ADDRESS_ROLE.external)
	if (internal) addressRoles.push(ADDRESS_ROLE.internal)

	if (showXpub) {
		const parentXpub = extendedPub.startsWith('zpub')
			? zpubToXpub(extendedPub)
			: node.neutered().toBase58()
		const parentZpub = extendedPub.startsWith('zpub')
			? extendedPub
			: xpubToZpub(parentXpub)

		printParentKeys({ xpub: parentXpub, zpub: parentZpub })
		console.log('')
	}

	for (const addressRole of addressRoles) {
		console.log(`${addressRole === 0 ? 'External' : 'Internal'} addresses:`)

		const addresses = deriveAddresses_p2wpkh(extendedPub, count, addressRole)
		const addressesWithPath = addresses.map((address, addrIdx) => ({
			address,
			path: `m/84'/0'/0'/${addressRole}/${addrIdx}`,
			url: `https://mempool.space/address/${address}`,
		}))
		printAddresses(addressesWithPath)
		console.log('')
	}
}

type DerivedAddress = {
	address: string
	path: string
	url?: string
}

function printAddresses(addresses: DerivedAddress[]) {
	const length = addresses.length
	const getIdxColWidth = (length: number) => {
		if (length <= 10) return 1
		if (length <= 100) return 2
		if (length <= 1_000) return 3
		if (length <= 10_000) return 4
		return 5
	}
	const getMaxColumnWidth = (items: string[]) => {
		const maxItemLength = items.reduce((max, item) => {
			return Math.max(max, item.length)
		}, 0)
		return maxItemLength
	}

	const table = createTable({
		head: ['#', 'Address', 'Derivation Path', 'Explorer'],
		colWidths: [
			getIdxColWidth(length) + 2,
			getMaxColumnWidth(addresses.map(({ address }) => address)),
			getMaxColumnWidth(addresses.map(({ path }) => path)) + 1,
			8,
		],
		style: { head: ['bold'] },
		colAligns: ['right', 'left', 'left', 'left'],
	})

	addresses.forEach(({ address, path }, index) => {
		const explorerUrl = `https://mempool.space/address/${address}`
		const clickableLink = `\u001B]8;;${explorerUrl}\u0007mempool\u001B]8;;\u0007`
		table.push([index, address, path, clickableLink])
	})

	console.log(table.toString())
}

function printParentKeys({ xpub, zpub }: { xpub: string; zpub: string }) {
	const maxColWidth = Math.max(xpub.length, zpub.length)
	const table = createTable({
		head: ['Type', 'Extended Public Key'],
		colWidths: [4, maxColWidth],
		style: { head: ['bold'] },
	})

	table.push(['xpub', xpub], ['zpub', zpub])

	console.log(table.toString())
}
