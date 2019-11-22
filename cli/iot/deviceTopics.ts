export const deviceTopics = (deviceId: string) => ({
	config: `/devices/${deviceId}/config`,
	state: `/devices/${deviceId}/state`,
})
