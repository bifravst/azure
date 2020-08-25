export const deviceTopics = {
	getTwinProperties: (rid: string): string => `$iothub/twin/GET/?$rid=${rid}`,
	getTwinPropertiesAccepted: (rid: string): string =>
		`$iothub/twin/res/200/?$rid=${rid}`,
	updateTwinReported: (rid: string): string =>
		`$iothub/twin/PATCH/properties/reported/?$rid=${rid}`,
	updateTwinReportedAccepted: new RegExp(
		`^\\$iothub/twin/res/204/\\?\\$rid=[a-f0-9-]+&\\$version=[0-9]+$`,
	),
	twinResponses: '$iothub/twin/res/#',
	desiredUpdate: {
		name: '$iothub/twin/PATCH/properties/desired/#',
		test: (s: string): boolean =>
			new RegExp(
				`^\\$iothub/twin/PATCH/properties/desired/\\?\\$version=[0-9]+$`,
			).test(s),
	},
	twinResponse: ({ status, rid }: { status: number; rid: string }): string =>
		`$iothub/twin/res/${status}/?$rid=${rid}`,
	messages: (deviceId: string): string =>
		`devices/${deviceId}/messages/events/`,
	batch: (deviceId: string): string =>
		`devices/${deviceId}/messages/events/batch`,
}
