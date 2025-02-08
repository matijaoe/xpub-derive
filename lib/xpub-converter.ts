import bs58check from 'bs58check'

/*
  This script uses version bytes as described in SLIP-132
  https://github.com/satoshilabs/slips/blob/master/slip-0132.md
*/

export const EXTENDED_PUBLIC_KEY_VERSIONS = new Map<string, number>([
	['xpub', 0x0488b21e],
	['ypub', 0x049d7cb2],
	['Ypub', 0x0295b43f],
	['zpub', 0x04b24746],
	['Zpub', 0x02aa7ed3],
	['tpub', 0x043587cf],
	['upub', 0x044a5262],
	['Upub', 0x024289ef],
	['vpub', 0x045f1cf6],
	['Vpub', 0x02575483],
])

/*
 * This function takes an extended public key (with any version bytes, it doesn't need to be an xpub)
 * and converts it to an extended public key formatted with the desired version bytes
 * @param xpub: an extended public key in base58 format. Example: xpub6CpihtY9HVc1jNJWCiXnRbpXm5BgVNKqZMsM4XqpDcQigJr6AHNwaForLZ3kkisDcRoaXSUms6DJNhxFtQGeZfWAQWCZQe1esNetx5Wqe4M
 * @param targetFormat: a string representing the desired prefix; must exist in the "prefixes" mapping defined above. Example: Zpub
 */
function changeVersionBytes(xpub: string, targetFormat: string): string {
	if (!EXTENDED_PUBLIC_KEY_VERSIONS.has(targetFormat)) {
		return 'Invalid target version'
	}

	// trim whitespace
	xpub = xpub.trim()

	try {
		const data = bs58check.decode(xpub)
		const newData = data.slice(4)
		const versionBytes = Buffer.alloc(4)
		versionBytes.writeUInt32BE(EXTENDED_PUBLIC_KEY_VERSIONS.get(targetFormat)!)
		const combined = Buffer.concat([versionBytes, newData])
		return bs58check.encode(combined)
	} catch (err) {
		return 'Invalid extended public key'
	}
}

export const convertXpubToZpub = (xpub: string): string => {
	return changeVersionBytes(xpub, 'zpub')
}

export const convertZpubToXpub = (zpub: string): string => {
	return changeVersionBytes(zpub, 'xpub')
}
