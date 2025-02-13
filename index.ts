import { Command } from 'commander'
import { ADDRESS_ROLES } from './config/networks'
import { convertXpubToZpub, convertZpubToXpub } from './lib/xpub-converter'
import {
	deriveAddresses_p2wpkh,
	getAddressDerivationPath_p2wpkh,
	getAddressMempoolUrl,
} from './utils'
import {
	printAddresses,
	printParentKeys,
	type DerivedAddress,
} from './utils/print'

const program = new Command()

program
	.name('derive_addrs')
	.description('Derives addresses from an extended public key.')
	.argument('<extendedPub>', 'Extended public key (xpub or zpub)')
	.option('-e, --external', 'Derive external addresses (chain=0)', false)
	.option('-i, --internal', 'Derive internal addresses (chain=1)', false)
	.option('-n, --count <number>', 'Number of addresses to derive', '5')
	.option('-x, --show-xpub', 'Show parent xpub/zpub', false)
	.option('-m, --mempool', 'Show mempool URLs', false)
	.option('-a, --account <number>', 'Account index (0+)', '0')
	.action((extendedPub, opts) => {
		let { count: addressCount, account: accountIndex } = opts
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
		if (!opts.external && !opts.internal) {
			opts.external = true
		}

		try {
			let rawAddressesExternal = opts.external
				? deriveAddresses_p2wpkh(
						extendedPub,
						addressCount,
						ADDRESS_ROLES.external
				  )
				: undefined
			let rawAddressesInternal = opts.internal
				? deriveAddresses_p2wpkh(
						extendedPub,
						addressCount,
						ADDRESS_ROLES.internal
				  )
				: undefined

			const addresses = {
				external: rawAddressesExternal?.map((address, addrIndex) => {
					const obj: DerivedAddress = {
						address,
						path: getAddressDerivationPath_p2wpkh({
							role: ADDRESS_ROLES.external,
							index: addrIndex,
							account: accountIndex,
						}),
					}
					if (opts.mempool) {
						obj.mempoolUrl = getAddressMempoolUrl(address)
					}
					return obj
				}),
				internal: rawAddressesInternal?.map((address, addrIndex) => {
					const obj: DerivedAddress = {
						address,
						path: getAddressDerivationPath_p2wpkh({
							role: ADDRESS_ROLES.internal,
							index: addrIndex,
							account: accountIndex,
						}),
					}
					if (opts.mempool) {
						obj.mempoolUrl = getAddressMempoolUrl(address)
					}
					return obj
				}),
			} satisfies Partial<Record<'external' | 'internal', DerivedAddress[]>>

			const xpub = extendedPub.startsWith('zpub')
				? convertZpubToXpub(extendedPub)
				: extendedPub
			const zpub = extendedPub.startsWith('zpub')
				? extendedPub
				: convertXpubToZpub(xpub)

			printDerivedAddresses(
				{
					addresses,
					parentKeys: opts.showXpub ? { xpub, zpub } : undefined,
				},
				{
					showMempoolUrl: opts.mempool,
				}
			)
		} catch (err) {
			console.error(`Error: ${(err as Error).message}`)
			process.exit(1)
		}
	})

program.parse(process.argv)

type PrintDerivedAddressesProps = {
	addresses: {
		external?: DerivedAddress[]
		internal?: DerivedAddress[]
	}
	parentKeys?: { xpub: string; zpub: string }
}

function printDerivedAddresses(
	{ addresses, parentKeys }: PrintDerivedAddressesProps,
	opts: { showMempoolUrl?: boolean } = {}
) {
	if (parentKeys) {
		printParentKeys(parentKeys)
		console.log('')
	}

	if (addresses?.external?.length) {
		console.log('External addresses:')
		printAddresses(addresses.external, opts)
		console.log('')
	}

	if (addresses?.internal?.length) {
		console.log('Internal addresses:')
		printAddresses(addresses.internal, opts)
		console.log('')
	}
}
