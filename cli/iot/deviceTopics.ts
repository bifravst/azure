export const deviceTopics = {
	getTwinProperties: (rid: string) => `$iothub/twin/GET/?$rid=${rid}`,
	updateTwinReported: (rid: string) =>
		`$iothub/twin/PATCH/properties/reported/?$rid=${rid}`,
	updateTwinReportedAccepted: (rid: string) =>
		new RegExp(`^\\$iothub/twin/res/204/\\?\\$rid=${rid}&\\$version=[0-9]+$`),
	twinResponses: '$iothub/twin/res/#',
	twinResponse: ({ status, rid }: { status: number; rid: string }) =>
		`$iothub/twin/res/${status}/?$rid=${rid}`,
}
