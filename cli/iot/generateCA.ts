import { promises as fs } from 'fs'
import { caFileLocations } from './caFileLocations'
import { run } from '../process/run'

/**
 * Generates a CA certificate
 */
export const generateCA = async (args: {
	certsDir: string
	log: (...message: any[]) => void
	debug: (...message: any[]) => void
}): Promise<{ certificate: string }> => {
	const { certsDir, log, debug } = args
	const caFiles = caFileLocations(certsDir)
	try {
		await fs.stat(certsDir)
	} catch {
		await fs.mkdir(certsDir)
		log(`Created ${certsDir}`)
	}

	let certExists = false
	try {
		await fs.stat(caFiles.cert)
		certExists = true
	} catch {
		// pass
	}
	if (certExists) {
		throw new Error(`CA Certificate exists: ${caFiles.cert}!`)
	}

	// Now generate the CA

	await run({
		command: 'openssl',
		args: ['genpkey', '-algorithm', 'RSA', '-out', caFiles.privateKey, '-pkeyopt', 'rsa_keygen_bits:2048'],
		log: debug,
	})

	await run({
		command: 'openssl',
		args: [
			'req',
			'-x509',
			'-new',
			'-nodes',
			'-key',
			caFiles.privateKey,
			'-sha256',
			'-days',
			'365',
			'-out',
			caFiles.cert,
			'-subj',
			'/CN=unused',
		],
		log: debug,
	})

	log(`Created CA certificate in ${caFiles.cert}`)

	const certificate = await fs.readFile(caFiles.cert, 'utf-8')

	return {
		certificate
	}
}
