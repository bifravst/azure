import { promises as fs } from 'fs'
import { caFileLocations } from './caFileLocations'
import { run } from '../process/run'

/**
 * Generates a CA certificate chain
 * @see https://github.com/Azure/azure-iot-sdk-c/blob/master/tools/CACertificates/CACertificateOverview.md#step-2---create-the-certificate-chain
 */
export const generateCAChain = async (args: {
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
		await fs.stat(caFiles.rootCert)
		certExists = true
	} catch {
		// pass
	}
	if (certExists) {
		throw new Error(`CA Certificate exists: ${caFiles.rootCert}!`)
	}

	// Creating the Root CA Private Key

	await run({
		command: 'openssl',
		args: [
			'genrsa',
			'-out', caFiles.rootPrivateKey,
			'4096'
		],
		log: debug,
	})

	// Creating the Root CA Certificate

	await run({
		command: 'openssl',
		args: [
			'req',
			'-x509',
			'-new',
			'-nodes',
			'-key',
			caFiles.rootPrivateKey,
			'-sha256',
			'-days',
			'365',
			'-out',
			caFiles.rootCert,
			'-extension', 'subjectKeyIdentifier = hash',
			'-extension', 'authorityKeyIdentifier = keyid:always,issuer',
			'-extension', 'basicConstraints = critical, CA:true',
			'-extension', 'keyUsage = critical, digitalSignature, cRLSign, keyCertSign',
			'-subj',
			'/CN=Azure IoT Hub Root CA Cert for Bifravst',
		],
		log: debug,
	})

	log(`Created CA root certificate in ${caFiles.rootCert}`)

	// Creating the Intermediate Device CA

	await run({
		command: 'openssl',
		args: [
			'genrsa',
			'-out', caFiles.intermediatePrivateKey,
			'4096'
		],
		log: debug,
	})

	// Creating the Intermediate Device CA CSR

	await run({
		command: 'openssl',
		args: [
			'req',
			'-new',
			'-sha256',
			'-subj',
			'/CN=Azure IoT Hub Root CA CSR for Bifravst',
			'-key', caFiles.intermediatePrivateKey,
			'-out', caFiles.intermediateCSR,
			'4096'
		],
		log: debug,
	})

	// Signing the Intermediate Certificate with Root CA Cert

	await run({
		command: 'openssl',
		args: [
			'ca',
			'-batch',
			'-extension', 'subjectKeyIdentifier = hash',
			'-extension', 'authorityKeyIdentifier = keyid:always,issuer',
			'-extension', 'basicConstraints = critical, CA:true',
			'-extension', 'keyUsage = critical, digitalSignature, cRLSign, keyCertSign',
			'-days', '365',
			'-notext',
			'-md', 'sha256',
			'-in', caFiles.intermediateCSR,
			'-out', caFiles.intermediateCert,
		],
		log: debug,
	})

	const certificate = await fs.readFile(caFiles.rootCert, 'utf-8')

	return {
		certificate
	}
}
