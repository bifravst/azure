export type TwinChangeEvent = {
	version: number
	tags?: { [key: string]: any }
	properties?: {
		desired?: { [key: string]: any }
		reported?: { [key: string]: any }
	}
}

export type DeviceMessage = {
	[key: string]: {
		v: any
		ts: number
	}
}

export type DeviceUpdate = TwinChangeEvent | DeviceMessage
