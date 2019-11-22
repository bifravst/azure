import * as path from 'path'

export const caFileLocations = (certsDir: string) => ({
	cert: path.resolve(certsDir, 'CA.pem'),
	privateKey: path.resolve(certsDir, 'CA.key'),
	verificationKey: path.resolve(certsDir, 'CA.verification.key'),
	verificationCSR: path.resolve(certsDir, 'CA.verification.csr'),
	verificationPEM: path.resolve(certsDir, 'CA.verification.pem'),
})
