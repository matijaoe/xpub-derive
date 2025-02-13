import Table from 'cli-table3'

export type DerivedAddress = {
	address: string
	path: string
	url?: string
	explorerUrl?: string
}

const createTable = (options?: Table.TableConstructorOptions) => {
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

/**
 * Creates a clickable terminal URL with custom text.
 * Uses ANSI escape sequences to make the text clickable in terminal.
 *
 * @param url - The URL to link to
 * @param text - The text to display (defaults to 'link')
 * @returns A string containing the ANSI escape sequences for a clickable link
 */
export const createClickableUrl = (
	url: string,
	text: string = 'link'
): string => {
	return `\u001B]8;;${url}\u0007${text}\u001B]8;;\u0007`
}

export const printAddresses = (
	addresses: DerivedAddress[],
	opts: { showExplorerUrl?: boolean } = {}
) => {
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
		head: [
			'#',
			'Address',
			'Derivation Path',
			opts.showExplorerUrl ? 'Explorer' : undefined,
		].filter(Boolean) as string[],
		colWidths: [
			getIdxColWidth(length) + 2,
			getMaxColumnWidth(addresses.map(({ address }) => address)),
			getMaxColumnWidth(addresses.map(({ path }) => path)) + 1,
			opts.showExplorerUrl ? 14 : null,
		].filter(Boolean),
		style: { head: ['bold'] },
		colAligns: ['right'],
	})

	addresses.forEach(({ address, path, explorerUrl }, index) => {
		const columns = [index, address, path]
		if (opts.showExplorerUrl) {
			const explorerLink = explorerUrl
				? createClickableUrl(explorerUrl, 'mempool.space')
				: ''
			columns.push(explorerLink)
		}
		table.push(columns)
	})

	console.log(table.toString())
}
