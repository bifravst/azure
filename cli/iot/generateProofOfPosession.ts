import { promises as fs } from 'fs'
import { caFileLocations } from './caFileLocations'
import { run } from '../process/run'

/**
 * Verifies the CA posessions
 * @see https://docs.microsoft.com/en-us/azure/iot-dps/how-to-verify-certificates
 */
export const generateProofOfPosession = async (args: {
	certsDir: string
	verificationCode: string
	log: (...message: any[]) => void
	debug: (...message: any[]) => void
}): Promise<{ verificationPEM: string }> => {
	const { certsDir, log, debug, verificationCode } = args
	const caFiles = caFileLocations(certsDir)

	// Create verification key
	await run({
		command: 'openssl',
		args: ['genrsa', '-out', caFiles.verificationKey, '2048'],
		log: debug,
	})

	// Create verification CSR
	await run({
		command: 'openssl',
		args: ['req', '-new', '-key', caFiles.verificationKey, '-out', caFiles.verificationCSR, '-subj',
			`/CN=${verificationCode}`,],
		log: debug,
	})

	// Sign CA cert

	await run({
		command: 'openssl',
		args: [
			'x509', '-req', '-in', caFiles.verificationCSR, '-CA', caFiles.cert, '-CAkey', caFiles.privateKey, '-CAcreateserial', '-out', caFiles.verificationPEM, '-days', '365', '-sha256'
		],
		log: debug,
	})

	log(`Created CA verification PEM in ${caFiles.verificationPEM}`)

	const verificationPEM = await fs.readFile(caFiles.verificationPEM, 'utf-8')

	return {
		verificationPEM
	}
}
