import { promises as fs } from 'fs'
import { caFileLocations } from './caFileLocations'
import { createCertificate, CertificateCreationResult } from 'pem'

/**
 * Generates a CA certificate chain
 * @see https://github.com/Azure/azure-iot-sdk-node/blob/5a7cd40145575175b4a100bbc84758f8a87c6d37/provisioning/tools/create_test_cert.js
 * @see http://busbyland.com/azure-iot-device-provisioning-service-via-rest-part-1/
 */
export const generateCAChain = async (args: {
	certsDir: string
	log: (...message: any[]) => void
	debug: (...message: any[]) => void
}): Promise<{ root: CertificateCreationResult, intermediate: CertificateCreationResult }> => {
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

	const config = (commonName: string) => [
		'[req]',
		'req_extensions = v3_req',
		'distinguished_name = req_distinguished_name',
		'x509_extensions = v3_ca',
		'[req_distinguished_name]',
		'commonName = ' + commonName,
		'[v3_req]',
		'basicConstraints = critical, CA:true'
	].join('\n')

	// Create the Root CA Cert

	const rootName = 'Bifravst Root CA'

	const rootCert = await new Promise<CertificateCreationResult>((resolve, reject) => createCertificate({
		commonName: rootName,
		serial: Math.floor(Math.random() * 1000000000),
		days: 365,
		selfSigned: true,
		config: config(rootName)
	}, (err, cert) => {
		if (err) return reject(err)
		resolve(cert)
	}))

	await fs.writeFile(caFiles.rootCert, rootCert.certificate);
	await fs.writeFile(caFiles.rootPrivateKey, rootCert.clientKey);

	debug('Root CA Certificate', caFiles.rootCert)

	// Create the intermediate CA cert (signed by the root)

	const intermediateName = 'Bifravst Intermediate CA'

	const intermediateCert = await new Promise<CertificateCreationResult>((resolve, reject) => createCertificate({
		commonName: intermediateName,
		serial: Math.floor(Math.random() * 1000000000),
		days: 365,
		selfSigned: true,
		config: config(intermediateName),
		serviceKey: rootCert.clientKey,
		serviceCertificate: rootCert.certificate
	}, (err, cert) => {
		if (err) return reject(err)
		resolve(cert)
	}))

	debug('Intermediate CA Certificate', caFiles.rootCert)


	await fs.writeFile(caFiles.intermediateCert, intermediateCert.certificate);
	await fs.writeFile(caFiles.intermediatePrivateKey, intermediateCert.clientKey);

	return {
		root: rootCert,
		intermediate: intermediateCert,
	}
}
