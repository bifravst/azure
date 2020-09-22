import { BatchDeviceUpdate, DeviceMessage } from '../lib/iotMessages'

export const batchToDoc = (batchUpdate: BatchDeviceUpdate): DeviceMessage[] =>
	Object.entries(batchUpdate)
		.map(([k, v]) => v.map((u) => ({ [k]: u })))
		.reduce((allUpdates, msgs) => [...allUpdates, ...msgs], [])
