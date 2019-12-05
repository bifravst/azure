import { promises as fs } from 'fs'
import {
	CARootFileLocations,
	CAIntermediateFileLocations,
} from './caFileLocations'
import { deviceFileLocations } from './deviceFileLocations'
import * as os from 'os'
import { createCertificate, CertificateCreationResult } from 'pem'
import { leafCertConfig } from './pemConfig'

/**
 * Generates a certificate for a device, signed with the CA
 */
export const generateDeviceCertificate = async ({
	certsDir,
	log,
	debug,
	deviceId,
	intermediateCertId,
}: {
	certsDir: string
	deviceId: string
	intermediateCertId: string
	log?: (...message: any[]) => void
	debug?: (...message: any[]) => void
}): Promise<{ deviceId: string }> => {
	log && log(`Generating certificate for device ${deviceId}`)
	const caRootFiles = CARootFileLocations(certsDir)
	const caIntermediateFiles = CAIntermediateFileLocations({
		certsDir,
		id: intermediateCertId,
	})
	const deviceFiles = deviceFileLocations({
		certsDir,
		deviceId,
	})

	const [
		intermediatePrivateKey,
		intermediateCert,
		rootCert,
	] = await Promise.all([
		fs.readFile(caIntermediateFiles.privateKey, 'utf-8'),
		fs.readFile(caIntermediateFiles.cert, 'utf-8'),
		fs.readFile(caRootFiles.cert, 'utf-8'),
	])

	const deviceCert = await new Promise<CertificateCreationResult>(
		(resolve, reject) =>
			createCertificate(
				{
					commonName: deviceId,
					serial: Math.floor(Math.random() * 1000000000),
					days: 365,
					config: leafCertConfig(deviceId),
					serviceKey: intermediatePrivateKey,
					serviceCertificate: intermediateCert,
				},
				(err, cert) => {
					if (err) return reject(err)
					resolve(cert)
				},
			),
	)

	debug && debug(deviceCert.certificate)

	const certWithChain = (
		await Promise.all([deviceCert.certificate, intermediateCert, rootCert])
	).join(os.EOL)

	await Promise.all([
		fs.writeFile(deviceFiles.certWithChain, certWithChain, 'utf-8').then(() => {
			debug && debug(`${deviceFiles.certWithChain} written`)
		}),
		fs
			.writeFile(deviceFiles.privateKey, deviceCert.clientKey, 'utf-8')
			.then(() => {
				debug && debug(`${deviceFiles.privateKey} written`)
			}),
		fs.writeFile(deviceFiles.cert, deviceCert.certificate, 'utf-8').then(() => {
			debug && debug(`${deviceFiles.cert} written`)
		}),
		fs
			.writeFile(deviceFiles.intermediateCertId, intermediateCertId, 'utf-8')
			.then(() => {
				debug && debug(`${deviceFiles.intermediateCertId} written`)
			}),
	])

	return { deviceId }
}
