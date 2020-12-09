/**
 * Device FOTA status
 * @see https://docs.microsoft.com/en-us/azure/iot-hub/tutorial-firmware-update
 */
export enum Status {
	// There is no pending firmware upgrade. currentFwVersion should match fwVersion from desired properties.
	CURRENT = 'current',
	// Firmware upgrade image is downloading.
	DOWNLOADING = 'downloading',
	// Verifying image file checksum and any other validations.
	VERIFYING = 'verifying',
	// Upgrade to the new image file is in progress.
	APPLYING = 'applying',
	// Device is rebooting as part of upgrade process.
	REBOOTING = 'rebooting',
	// An error occurred during the upgrade process. Additional details should be specified in fwUpdateSubstatus.
	ERROR = 'error',
	// Upgrade rolled back to the previous version due to an error.
	ROLLEDBACK = 'rolledback',
}
