export const deviceTopics = {
	getTwinProperties: (rid: string) => `$iothub/twin/GET/?$rid=${rid}`,
	updateTwinReported: (rid: string) =>
		`$iothub/twin/PATCH/properties/reported/?$rid=${rid}`,
	updateTwinReportedAccepted: new RegExp(
		`^\\$iothub/twin/res/204/\\?\\$rid=[a-f0-9-]+&\\$version=[0-9]+$`,
	),
	twinResponses: '$iothub/twin/res/#',
	desiredUpdate: {
		name: '$iothub/twin/PATCH/properties/desired/#',
		test: (s: string) =>
			new RegExp(
				`^\\$iothub/twin/PATCH/properties/desired/\\?\\$version=[0-9]+$`,
			).test(s),
	},
	twinResponse: ({ status, rid }: { status: number; rid: string }) =>
		`$iothub/twin/res/${status}/?$rid=${rid}`,
	messages: (deviceId: string) => `devices/${deviceId}/messages/events/`,
}
