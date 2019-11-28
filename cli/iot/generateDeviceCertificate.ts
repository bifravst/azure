import { promises as fs } from 'fs'
import { caFileLocations } from './caFileLocations'
import { deviceFileLocations } from './deviceFileLocations'
import * as os from 'os'
import { createCertificate, CertificateCreationResult } from 'pem'

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

	const [
		intermediatePrivateKey,
		intermediateCert
	] = await Promise.all([
		fs.readFile(caFiles.intermediatePrivateKey, 'utf-8'),
		fs.readFile(caFiles.intermediateCert, 'utf-8'),
	])

	console.log({
		intermediatePrivateKey,
		intermediateCert
	})

	const deviceCert = await new Promise<CertificateCreationResult>((resolve, reject) => createCertificate({
		commonName: deviceId,
		serial: Math.floor(Math.random() * 1000000000),
		days: 365,
		selfSigned: true,
		config: [
			'[req]',
			'req_extensions = v3_req',
			'distinguished_name = req_distinguished_name',
			'[req_distinguished_name]',
			'commonName = ' + deviceId,
			'[v3_req]',
			'extendedKeyUsage = critical,clientAuth'
		].join('\n'),
		serviceKey: intermediatePrivateKey,
		serviceCertificate: intermediateCert
	}, (err, cert) => {
		if (err) return reject(err)
		resolve(cert)
	}))

	debug && debug(deviceCert.certificate)

	const certWithChain = (await Promise.all([
		deviceCert.certificate,
		intermediateCert,
		fs.readFile(caFiles.rootCert, 'utf-8'),
	])).join(os.EOL)

	await Promise.all([
		fs.writeFile(deviceFiles.certWithChain, certWithChain, 'utf-8').then(() => {
			debug && debug(`${deviceFiles.certWithChain} written`)
		}),
		fs.writeFile(deviceFiles.privateKey, deviceCert.clientKey, 'utf-8').then(() => {
			debug && debug(`${deviceFiles.privateKey} written`)
		}),
		fs.writeFile(deviceFiles.cert, deviceCert.certificate, 'utf-8').then(() => {
			debug && debug(`${deviceFiles.cert} written`)
		})
	])

	return { deviceId }
}
