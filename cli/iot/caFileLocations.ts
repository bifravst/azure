import * as path from 'path'

export const caFileLocations = (certsDir: string) => ({
	rootCert: path.resolve(certsDir, 'CA.root.pem'),
	rootPrivateKey: path.resolve(certsDir, 'CA.root.key'),
	intermediatePrivateKey: path.resolve(certsDir, 'CA.intermediate.key'),
	intermediateCert: path.resolve(certsDir, 'CA.intermediate.key'),
	verificationKey: path.resolve(certsDir, 'CA.verification.key'),
	verificationCSR: path.resolve(certsDir, 'CA.verification.csr'),
	verificationPEM: path.resolve(certsDir, 'CA.verification.pem'),
})
