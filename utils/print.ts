import Table from 'cli-table3'

export type DerivedAddress = {
	address: string
	path: string
	url?: string
	mempoolUrl?: string
}

function createTable(options?: Table.TableConstructorOptions) {
	const TABLE_PADDING = 1
	const TABLE_SIDE_PADDING = TABLE_PADDING * 2

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

export const printParentKeys = ({
	xpub,
	zpub,
}: {
	xpub: string
	zpub: string
}) => {
	const maxColWidth = Math.max(xpub.length, zpub.length)
	const table = createTable({
		head: ['Type', 'Extended Public Key'],
		colWidths: [4, maxColWidth],
		style: { head: ['bold'] },
	})

	table.push(['xpub', xpub], ['zpub', zpub])

	console.log(table.toString())
}

export const printAddresses = (addresses: DerivedAddress[]) => {
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
		head: ['#', 'Address', 'Derivation Path', 'Mempool'],
		colWidths: [
			getIdxColWidth(length) + 2,
			getMaxColumnWidth(addresses.map(({ address }) => address)),
			getMaxColumnWidth(addresses.map(({ path }) => path)) + 1,
			10,
		],
		style: { head: ['bold'] },
		colAligns: ['right'],
	})

	addresses.forEach(({ address, path, mempoolUrl }, index) => {
		const mempoolLink = mempoolUrl
			? `\u001B]8;;${mempoolUrl}\u0007mempool\u001B]8;;\u0007`
			: ''
		table.push([index, address, path, mempoolLink])
	})

	console.log(table.toString())
}
