import * as path from 'path'

export const deviceFileLocations = ({
	certsDir,
	deviceId,
}: {
	certsDir: string
	deviceId: string
}) => ({
	privateKey: path.resolve(certsDir, `device-${deviceId}.key`),
	cert: path.resolve(certsDir, `device-${deviceId}.pem`),
	certWithChain: path.resolve(certsDir, `device-${deviceId}.bundle.pem`),
	registry: path.resolve(certsDir, `device-${deviceId}.registry.json`),
})
