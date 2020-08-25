import { BatchDeviceUpdate, DeviceUpdate } from '../lib/iotMessages'

export const batchToDoc = (batchUpdate: BatchDeviceUpdate): DeviceUpdate[] =>
	Object.entries(batchUpdate)
		.map(([k, v]) => v.map((u) => ({ [k]: u })))
		.reduce((allUpdates, msgs) => [...allUpdates, ...msgs], [])
