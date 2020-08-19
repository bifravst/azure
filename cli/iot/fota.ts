/**
 * Device FOTA status
 * @see https://docs.microsoft.com/en-us/azure/iot-hub/tutorial-firmware-update
 */
export enum Status {
	// There is no pending firmware update. currentFwVersion should match fwVersion from desired properties.
	CURRENT = 'current',
	// Firmware update image is downloading.
	DOWNLOADING = 'downloading',
	// Verifying image file checksum and any other validations.
	VERIFYING = 'verifying',
	// Update to the new image file is in progress.
	APPLYING = 'applying',
	// Device is rebooting as part of update process.
	REBOOTING = 'rebooting',
	// An error occurred during the update process. Additional details should be specified in fwUpdateSubstatus.
	ERROR = 'error',
	// Update rolled back to the previous version due to an error.
	ROLLEDBACK = 'rolledback',
}
