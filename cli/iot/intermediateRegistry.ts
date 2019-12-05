import { promises as fs } from 'fs'
import * as path from 'path'

export const CAIntermediateRegistryLocation = (certsDir: string) => ({
	registry: path.resolve(certsDir, 'intermediate.json'),
})

export const list = async ({
	certsDir,
}: {
	certsDir: string
}): Promise<string[]> => {
	const intermediateRegistry = CAIntermediateRegistryLocation(certsDir).registry
	try {
		return JSON.parse(await fs.readFile(intermediateRegistry, 'utf-8'))
	} catch {
		return []
	}
}

export const add = async ({
	certsDir,
	id,
}: {
	certsDir: string
	id: string
}) => {
	const intermediateRegistry = CAIntermediateRegistryLocation(certsDir).registry
	let registry = [] as string[]

	try {
		registry = [id, ...(await list({ certsDir }))]
	} catch {
		registry = [id]
	} finally {
		await fs.writeFile(intermediateRegistry, JSON.stringify(registry), 'utf-8')
	}
}
