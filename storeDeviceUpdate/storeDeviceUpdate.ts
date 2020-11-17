import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { r } from '../lib/http'
import { log } from '../lib/log'
import { v4 } from 'uuid'
import {
	BlobServiceClient,
	StorageSharedKeyCredential,
} from '@azure/storage-blob'
import { fromEnv } from '../lib/fromEnv'

const { fotaStorageAccountName, fotaStorageAccessKey } = fromEnv({
	fotaStorageAccountName: 'FOTA_STORAGE_ACCOUNT_NAME',
	fotaStorageAccessKey: 'FOTA_STORAGE_ACCESS_KEY',
})(process.env)
const fotaStorageContainer = 'updates'

const sharedKeyCredential = new StorageSharedKeyCredential(
	fotaStorageAccountName,
	fotaStorageAccessKey,
)
const blobServiceClient = new BlobServiceClient(
	`https://${fotaStorageAccountName}.blob.core.windows.net`,
	sharedKeyCredential,
)
const containerClient = blobServiceClient.getContainerClient(
	fotaStorageContainer,
)

const storeDeviceUpdate: AzureFunction = async (
	context: Context,
	req: HttpRequest,
): Promise<void> => {
	const { body } = req
	log(context)({
		fotaStorageAccountName,
		fotaStorageAccessKey,
		bodyLength: body.length,
	})
	try {
		const id = v4()
		const blobName = `${id}.bin`
		const blockBlobClient = containerClient.getBlockBlobClient(blobName)
		const file = Buffer.from(body, 'base64')
		await blockBlobClient.upload(file, file.length, {
			blobHTTPHeaders: {
				blobContentType: 'text/octet-stream',
				blobCacheControl: 'public, max-age=31536000',
			},
		})
		const url = `https://${fotaStorageAccountName}.blob.core.windows.net/${fotaStorageContainer}/${blobName}`
		log(context)(`Upload block blob ${blobName} successfully`, url)
		context.res = r({ success: true, url })
	} catch (error) {
		log(context)({
			error: error.message,
		})
		context.res = r(error, 500)
	}
}

export default storeDeviceUpdate
