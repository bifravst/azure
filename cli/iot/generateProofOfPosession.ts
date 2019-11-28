import { promises as fs } from 'fs'
import { caFileLocations } from './caFileLocations'
import { createCertificate, CertificateCreationResult } from 'pem'

/**
 * Verifies the CA posessions
 * @see https://github.com/Azure/azure-iot-sdk-node/blob/5a7cd40145575175b4a100bbc84758f8a87c6d37/provisioning/tools/create_test_cert.js
 * @see http://busbyland.com/azure-iot-device-provisioning-service-via-rest-part-1/
 */
export const generateProofOfPosession = async (args: {
	certsDir: string
	verificationCode: string
	log: (...message: any[]) => void
	debug: (...message: any[]) => void
}): Promise<{ verification: CertificateCreationResult, }> => {
	const { certsDir, log, debug, verificationCode } = args
	const caFiles = caFileLocations(certsDir)

	const [
		rootKey,
		rootCert
	] = await Promise.all([
		fs.readFile(caFiles.rootPrivateKey, 'utf-8'),
		fs.readFile(caFiles.rootCert, 'utf-8'),
	])

	const verificationCert = await new Promise<CertificateCreationResult>((resolve, reject) => createCertificate({
		commonName: verificationCode,
		serial: Math.floor(Math.random() * 1000000000),
		days: 1,
		config: [
			'[req]',
			'req_extensions = v3_req',
			'distinguished_name = req_distinguished_name',
			'[req_distinguished_name]',
			'commonName = ' + verificationCode,
			'[v3_req]',
			'extendedKeyUsage = critical,clientAuth'
		].join('\n'),
		serviceKey: rootKey,
		serviceCertificate: rootCert
	}, (err, cert) => {
		if (err) return reject(err)
		resolve(cert)
	}))

	log('Verification cert', caFiles.verificationCert)
	debug(verificationCert.certificate)

	await fs.writeFile(caFiles.verificationCert, verificationCert.certificate);
	await fs.writeFile(caFiles.verificationKey, verificationCert.clientKey);

	return {
		verification: verificationCert,
	}
}
