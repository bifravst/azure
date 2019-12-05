import * as path from 'path'

export const CARootFileLocations = (certsDir: string) => ({
	name: path.resolve(certsDir, 'CA.root.name'),
	cert: path.resolve(certsDir, 'CA.root.pem'),
	privateKey: path.resolve(certsDir, 'CA.root.key'),
	verificationKey: path.resolve(certsDir, 'CA.verification.key'),
	verificationCert: path.resolve(certsDir, 'CA.verification.pem'),
})

export const CAIntermediateFileLocations = ({
	certsDir,
	id,
}: {
	certsDir: string
	id: string
}) => ({
	privateKey: path.resolve(certsDir, `CA.intermediate.${id}.key`),
	cert: path.resolve(certsDir, `CA.intermediate.${id}.pem`),
})
