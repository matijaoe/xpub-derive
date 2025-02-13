import { Command, InvalidArgumentError } from 'commander'
import { ADDRESS_ROLES } from './config/networks'
import { convertXpubToZpub, convertZpubToXpub } from './lib/xpub-converter'
import {
	deriveAddresses_p2wpkh,
	getAddressDerivationPath_p2wpkh,
	getAddressExplorerUrl,
	isXpub,
	isZpub,
} from './utils'
import {
	printAddresses,
	printParentKeys,
	type DerivedAddress,
} from './utils/print'

interface ParsedOptions {
	external: boolean
	receive: boolean
	internal: boolean
	change: boolean
	count: number
	showXpub: boolean
	explorer: boolean
	account: number
	script?: ScriptType
}

// Define the allowed script types (only native-segwit for now)
// TODO: define global config
// https://github.com/synonymdev/beignet/blob/master/src/shapes/wallet.ts
// https://github.com/synonymdev/beignet/blob/master/src/types/wallet.ts
const SCRIPT_TYPE = {
	NATIVE_SEGWIT: 'native-segwit',
	// TODO: To be implemented:
	// LEGACY: 'legacy',
	// NESTED_SEGWIT: 'nested-segwit',
	// TAPROOT: 'taproot'
} as const
type ScriptType = (typeof SCRIPT_TYPE)[keyof typeof SCRIPT_TYPE]

const parseScriptType = (value: string): ScriptType => {
	const lower = value.toLowerCase()
	if (!Object.values(SCRIPT_TYPE).includes(lower as ScriptType)) {
		throw new InvalidArgumentError(
			`Invalid script type. Valid values are: ${Object.values(SCRIPT_TYPE).join(
				', '
			)}`
		)
	}
	return lower as ScriptType
}

const program = new Command()

program
	.name('derive_addrs')
	.description('Derives addresses from an extended public key.')
	.argument('<extendedPub>', 'Extended public key (xpub or zpub)')
	.option(
		'-s, --script <type>',
		'Script type: native-segwit (for xpub or zpub). Defaults: xpub → native-segwit (until legacy implemented), zpub → native-segwit',
		parseScriptType
	)
	.option(
		'-e, --external',
		'Derive external/receiving addresses (chain=0)',
		false
	)
	.option('--receive', 'Alias for --external (chain=0)', false)
	.option('-i, --internal', 'Derive internal/change addresses (chain=1)', false)
	.option('--change', 'Alias for --internal (chain=1)', false)
	.option('-n, --count <number>', 'Number of addresses to derive', '5')
	.option('-x, --show-xpub', 'Show parent xpub/zpub', false)
	.option('--explorer', 'Show address block explorer URLs', false)
	.option('-a, --account <number>', 'Account index (0+)', '0')
	.action((extendedPub: string, opts: ParsedOptions) => {
		let { count: addressCount, account: accountIndex } = opts
		addressCount = parseInt(String(addressCount), 10)
		accountIndex = parseInt(String(accountIndex), 10)
		if (isNaN(addressCount) || addressCount < 1) {
			console.error('Count must be a positive integer.')
			process.exit(1)
		}
		if (addressCount > 100_000) {
			console.error('Count must be less than 100,000.')
			process.exit(1)
		}

		const isExternal = opts.external || opts.receive
		const isInternal = opts.internal || opts.change

		// If neither is specified, default to external addresses only.
		if (!isExternal && !isInternal) {
			opts.external = true
		}

		// Determine the default script type based on the key prefix.
		// TODO: until more script types are supported, default to native-segwit
		const defaultScriptType: ScriptType = SCRIPT_TYPE.NATIVE_SEGWIT
		const userScriptType: ScriptType = opts.script || defaultScriptType

		// Enforce that zpub keys only support native segwit.
		if (isZpub(extendedPub) && userScriptType !== SCRIPT_TYPE.NATIVE_SEGWIT) {
			console.error(
				`Error: zpub keys only support native-segwit addresses, not "${userScriptType}".`
			)
			process.exit(1)
		}

		// At this point, we support native-segwit derivation.
		try {
			const rawAddressesExternal = isExternal
				? deriveAddresses_p2wpkh(
						extendedPub,
						addressCount,
						ADDRESS_ROLES.external
				  )
				: undefined
			const rawAddressesInternal = isInternal
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
					if (opts.explorer) {
						obj.explorerUrl = getAddressExplorerUrl(address, 'mempool.space')
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
					if (opts.explorer) {
						obj.explorerUrl = getAddressExplorerUrl(address, 'mempool.space')
					}
					return obj
				}),
			} satisfies Partial<Record<'external' | 'internal', DerivedAddress[]>>

			const xpub = isZpub(extendedPub)
				? convertZpubToXpub(extendedPub)
				: extendedPub
			const zpub = isXpub(extendedPub) ? extendedPub : convertXpubToZpub(xpub)

			printDerivedAddresses(
				{
					addresses,
					parentKeys: opts.showXpub ? { xpub, zpub } : undefined,
				},
				{ showExplorerUrl: opts.explorer }
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
	opts: { showExplorerUrl?: boolean } = {}
) {
	if (parentKeys) {
		printParentKeys(parentKeys)
		console.log('')
	}

	if (addresses?.external?.length) {
		console.log('External addresses (receiving):')
		printAddresses(addresses.external, opts)
		console.log('')
	}

	if (addresses?.internal?.length) {
		console.log('Internal addresses (change):')
		printAddresses(addresses.internal, opts)
		console.log('')
	}
}
