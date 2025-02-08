import { HDKey } from '@scure/bip32'
import { bech32 } from '@scure/base'
import { sha256 } from '@noble/hashes/sha256'
import { ripemd160 } from '@noble/hashes/ripemd160'

const SLIP132 = {
	xpub: { public: 0x0488b21e, private: 0x0488ade4 }, // Legacy (BIP44)
	ypub: { public: 0x049d7cb2, private: 0x049d7878 }, // Nested SegWit (BIP49)
	zpub: { public: 0x04b24746, private: 0x04b2430c }, // Native SegWit (BIP84)
}

const parseZpub = (zpub: string): HDKey =>
	HDKey.fromExtendedKey(zpub, SLIP132.zpub)

const parseXpub = (xpub: string): HDKey =>
	HDKey.fromExtendedKey(xpub, SLIP132.xpub)

const deriveSegWitAddresses = (extendedKey: string, count: number = 5) => {
	const hdNode = extendedKey.startsWith('zpub')
		? parseZpub(extendedKey)
		: parseXpub(extendedKey)

	for (let i = 0; i < count; i++) {
		const child = hdNode.deriveChild(0).deriveChild(i)
		const pubkey = child.publicKey!
		const pubKeyHash = ripemd160(sha256(pubkey))
		const words = bech32.toWords(Uint8Array.from([0, ...pubKeyHash]))
		const address = bech32.encode('bc', words)
		console.log(`Address ${i}: ${address} (m/84'/0'/0'/0/${i})`)
	}
}

const args = process.argv.slice(2)
if (args.length < 1) {
	console.error('Usage: bun run derive_zpub.ts <zpub> [count]')
	process.exit(1)
}

const zpub = args[0]
const count = args[1] ? parseInt(args[1], 10) : 5
deriveSegWitAddresses(zpub, count)
