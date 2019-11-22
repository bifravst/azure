import * as path from 'path'

export const deviceFileLocations = ({
	certsDir,
	deviceId,
}: {
	certsDir: string
	deviceId: string
}) => ({
	privateKey: path.resolve(certsDir, `device-${deviceId}.private.pem`),
	publicKey: path.resolve(certsDir, `device-${deviceId}.pem`),
	csr: path.resolve(certsDir, `device-${deviceId}.csr`),
	json: path.resolve(certsDir, `device-${deviceId}.json`)
})
