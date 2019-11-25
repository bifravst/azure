import { promises as fs } from 'fs'
import { caFileLocations } from './caFileLocations'
import { deviceFileLocations } from './deviceFileLocations'
import { run } from '../process/run'
import * as os from 'os'

/**
 * Generates a certificate for a device, signed with the CA
 */
export const generateDeviceCertificate = async ({
	certsDir,
	log,
	debug,
	deviceId,
}: {
	certsDir: string
	deviceId: string
	log?: (...message: any[]) => void
	debug?: (...message: any[]) => void
}): Promise<{ deviceId: string }> => {
	try {
		await fs.stat(certsDir)
	} catch {
		throw new Error(`${certsDir} does not exist.`)
	}

	log && log(`Generating certificate for device ${deviceId}`)
	const caFiles = caFileLocations(certsDir)
	const deviceFiles = deviceFileLocations({
		certsDir,
		deviceId,
	})

	// Create a device private key
	await run({
		command: 'openssl',
		args: [
			'genpkey', '-algorithm', 'RSA', '-out', deviceFiles.privateKey, '-pkeyopt', 'rsa_keygen_bits:2048'
		],
		log: debug,
	})

	// Create a CSR from the device private key
	await run({
		command: 'openssl',
		args: [
			'req', '-new', '-sha256', '-key', deviceFiles.privateKey, '-out', deviceFiles.csr, '-subj', '/CN=unused-device'
		],
		log: debug,
	})

	// Create a public key and sign it with the CA private key. 
	const validityInDays = 10950
	await run({
		command: 'openssl',
		args: [
			'x509',
			'-req',
			'-in',
			deviceFiles.csr,
			'-CAkey',
			caFiles.privateKey,
			'-CA',
			caFiles.cert,
			'-CAcreateserial',
			'-days',
			`${validityInDays}`,
			'-sha256',
			'-out',
			deviceFiles.cert,
		],
		log: debug,
	})

	const certWithCa = (await Promise.all([
		fs.readFile(deviceFiles.cert),
		fs.readFile(caFiles.cert),
	])).join(os.EOL)

	await fs.writeFile(deviceFiles.certWithCA, certWithCa, 'utf-8')

	return { deviceId }
}
