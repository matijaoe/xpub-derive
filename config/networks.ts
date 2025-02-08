export const ADDRESS_ROLES = {
	external: 0, // receive addresses
	internal: 1, // change addresses
} as const

export type AddressRole = (typeof ADDRESS_ROLES)[keyof typeof ADDRESS_ROLES]
